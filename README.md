# Orderflow

A campaign data portal for an ad platform: clients log in and manage their own advertising campaigns, while admins can see across all clients. It's a small full-stack project built to demonstrate a realistic role-based access control (RBAC) system end to end — backend, frontend, automated tests at multiple levels, CI, structured observability, and an AI-assisted test-failure triage agent on top.

The core problem it's built around: **a client must never be able to see or create data belonging to another client, and this needs to be verifiable, not just assumed.** Every layer of the project — the API, the UI, the test suite, and the triage tooling — is built to make that guarantee checkable.

## Table of Contents

- [Architecture](#architecture)
  - [Backend](#backend)
  - [Frontend](#frontend)
  - [Testing](#testing)
  - [CI/CD](#cicd)
  - [Observability](#observability)
  - [Triage Agent](#triage-agent)
- [Project Structure](#project-structure)
- [Running It Locally](#running-it-locally)
- [Known Limitations](#known-limitations)

## Architecture

```
┌────────────┐      ┌──────────────┐      ┌───────────┐
│  Frontend  │─────▶│   Backend    │─────▶│  MongoDB  │
│  (React)   │      │  (Express)   │      └───────────┘
└────────────┘      │              │
                     │  RBAC        │─────▶┌───────────────┐
                     │  middleware  │      │ Elasticsearch │──▶ Kibana
                     │  + logging   │      └───────────────┘
                     └──────────────┘             ▲
                                                   │
┌──────────────┐     ┌──────────────┐             │
│  Playwright  │     │   Triage     │─────────────┘
│  (API + UI)  │     │   Agent      │  (reads structured logs)
└──────────────┘     │  (Claude)    │
                      └──────────────┘
```

### Backend

`backend/` — Express + TypeScript, MongoDB via Mongoose.

- **Data model**: a `Campaign` (`src/models/Campaign.ts`) belongs to exactly one `clientId` and tracks `name`, `budget`, `impressions`, and `clicks`.
- **RBAC middleware** (`src/middleware/auth.ts`): every request carries an `x-user-role` header (`admin`, `clientA`, or `clientB`) and an `x-client-id` header. The middleware attaches `{ role, clientId }` to `req.user` and rejects requests with no role (`401`).
- **Routes** (`src/routes/campaigns.ts`):
  - `POST /campaigns` — always forces `clientId` from the authenticated user, ignoring anything sent in the request body. This is the actual enforcement point: a client cannot create data under another client's ID no matter what the request body claims.
  - `GET /campaigns` — admins see every campaign; clients only see campaigns filtered to their own `clientId`.
- **Error handling**: route-level try/catch for expected failures (e.g. Mongoose validation) plus a global Express error-handling middleware (`src/middleware/errorHandler.ts`) that catches anything unhandled (e.g. a database outage) and returns a clean `500` instead of crashing the process.

### Frontend

`frontend/` — React + TypeScript, built with Vite.

- A minimal login screen (`App.tsx`) lets you pick a role from a dropdown and "log in" — this simulates auth without a real session system, since the focus of this project is the RBAC enforcement itself, not authentication.
- A `Dashboard` component (`Dashboard.tsx`) fetches and creates campaigns against the backend, sending the selected role/clientId as headers on every request, and renders the results in a table with loading and error states.

### Testing

`playwright-tests/` — Playwright, covering the RBAC guarantee at two different levels:

- **API-level** (`tests/rbac.spec.ts`) — uses Playwright's `request` fixture to hit the backend directly: verifies a missing auth header returns `401`, a spoofed `clientId` in a request body gets overridden server-side, and a client's `GET /campaigns` never returns another client's data.
- **UI-level** (`tests/rbac-ui.spec.ts`) — drives the real running frontend through a **Page Object Model** (`tests/pages/DashboardPage.ts`, exposing `login()` and `getCampaignNames()`), seeding known campaigns via the API and asserting on what each role actually sees rendered in the browser.

Testing the same guarantee at both the API and UI level is deliberate: it protects against both "the backend leaks data" and "the backend is correct but the UI accidentally shows the wrong thing."

### CI/CD

`.github/workflows/playwright.yml` — GitHub Actions, running on every push/PR to `main`:

1. Starts MongoDB as a service container (with a health check).
2. Installs and starts the backend, waiting on `/health` before proceeding.
3. Installs and starts the frontend dev server, waiting on it the same way.
4. Installs Playwright and its browsers, then runs the full suite (API + UI tests) against the live services.
5. Uploads the Playwright HTML report as a build artifact, and dumps backend/frontend logs on failure for debugging.

### Observability

Backend requests are logged twice: to the console (unchanged, human-readable) and as structured JSON to Elasticsearch, via `winston` + `winston-elasticsearch` (`backend/src/logger.ts`, `backend/src/middleware/requestLogger.ts`).

Every request log includes `timestamp`, `method`, `route`, `statusCode`, `role`, and `clientId`. Any response with a non-2xx status is logged at `error` level with the actual error message (and, for unhandled server errors, a full stack trace) — the idea being that a log should be enough to diagnose what went wrong without reproducing the failure locally.

`docker-compose.yml` at the project root runs a single-node Elasticsearch and Kibana for local development, so logs can be explored and visualized in Kibana.

### Triage Agent

`triage-agent/` — a standalone Node/TypeScript project that uses Claude (via `@langchain/anthropic`) to automatically classify a failing test into one of five categories, using the surrounding backend logs as context:

- `product_bug` — a genuine defect in application logic
- `flaky_test` — a timing/race-condition failure likely to pass on retry
- `environment_issue` — an infrastructure problem (DB down, network/DNS failure, etc.), not an app defect
- `locator_drift` — a UI test failing because a Playwright selector no longer matches the current UI, not a real bug
- `not_a_failure` — the input actually represents expected/correct behavior (e.g. a test intentionally checking that invalid input gets rejected)

**How it works**: the agent is an actual [LangGraph](https://github.com/langchain-ai/langgraphjs) `StateGraph` (`triageGraph.ts`), not just a single prompt call:

1. **`fetchLogsNode`** — calls `fetchLogs.ts`, which queries Elasticsearch for all log entries within a time window around the failure's timestamp, and adds them to the graph's state.
2. **`classifyNode`** — sends the test name, error message, stack trace, and those surrounding logs to `claude-haiku-4-5` (`classifyFailure.ts`), with a system prompt defining the five categories, and parses its structured JSON response (`{ category, confidence, reasoning }`).
3. **Conditional edge** — if `confidence < 0.7`, routes to **`reconsiderNode`**, which makes a second Claude call showing the model its own prior answer and asking it to genuinely reconsider (not just repeat itself), replacing the classification in state. Otherwise it routes straight to the end.

`runTriage()` runs the graph end to end and returns the final classification plus a `reconsidered` flag indicating whether the second-pass node ran.

**Evaluation**: `evalSet.ts` contains 24 hand-built, realistic test-failure cases spanning all five categories (excluding `not_a_failure`, which was added after discovering the gap below). `runEval.ts` runs every case through the full graph (via `runTriage`) and reports accuracy, how many cases triggered reconsideration, and a breakdown of any mismatches.

Current result: **21/24 correct (87.5%)**, **0 cases triggered reconsideration**. The remaining 3 mismatches are genuinely ambiguous cases rather than obvious classifier errors — for example, a UI timeout on a "success toast" after a successful backend write is consistent with the toast rendering late (flaky), the toast never rendering (bug), or the toast's selector being stale (locator drift), and nothing in a text-only log/error/stack trace can disambiguate that. Closing this gap further would need richer signals than logs alone — e.g. a Playwright trace or screenshot.

**An honest finding from this eval run**: the reconsideration path never fired, on any of the 24 cases — including the 3 it got wrong. The model was just as confident (≥0.7) on its incorrect answers as on its correct ones, so the `confidence < 0.7` gate isn't actually a useful signal for "this answer might be wrong" here. A confidence-gated retry only helps if the model's stated confidence is calibrated to its actual accuracy, and on this eval set it wasn't. (Separately verified the reconsideration branch itself works correctly — it does trigger and does run a second Claude call — using deliberately low-confidence synthetic inputs; it simply never triggered on this particular eval set.)

One finding from building this eval set: the classifier initially had no way to say "this isn't actually a failure" and would force-fit expected/correct behavior (like a test verifying a `401` is correctly returned) into one of the four failure categories, reasoning its way to a false "bug." Adding the `not_a_failure` category fixed this — a concrete example of why an eval set is worth building even for a small classifier: it surfaces gaps in the label space, not just wrong predictions.

## Project Structure

```
orderflow/
├── backend/            Express API, MongoDB models, RBAC middleware, logging
├── frontend/           React + Vite client (login screen, campaign dashboard)
├── playwright-tests/   API and UI test suites, Page Object Model
├── triage-agent/       Standalone LangChain/Claude-based failure triage tool
├── docker-compose.yml  Elasticsearch + Kibana for local observability
└── .github/workflows/  CI pipeline (Playwright against live backend + frontend)
```

## Running It Locally

**Prerequisites**: Node.js 24+, Docker.

**1. Start MongoDB**

```bash
docker run -d --name orderflow-mongo -p 27017:27017 mongo:7
```

**2. Start Elasticsearch + Kibana**

```bash
docker compose up -d
```

Kibana will be available at `http://localhost:5601`, Elasticsearch at `http://localhost:9200`.

**3. Start the backend**

```bash
cd backend
npm install
npx ts-node src/server.ts
```

Runs on `http://localhost:3000`. Requires a `.env` file with `MONGO_URI` and `ELASTICSEARCH_NODE` (see `backend/.env`).

**4. Start the frontend**

```bash
cd frontend
npm install
npm run dev
```

Runs on `http://localhost:5173`.

**5. Run the Playwright tests**

```bash
cd playwright-tests
npm install
npx playwright test
```

Requires the backend and frontend from steps 3–4 to already be running.

**6. Run the triage agent eval**

```bash
cd triage-agent
npm install
npx ts-node src/runEval.ts
```

Requires an `ANTHROPIC_API_KEY` in `triage-agent/.env`, and Elasticsearch running (step 2) with some real log data in it (generated by using the app or running the Playwright suite).

## Known Limitations

- Login is simulated (a role picker, no real authentication/session) — the project's focus is RBAC enforcement given an authenticated identity, not the identity system itself.
- The eval set (24 cases) is hand-written, not sampled from real historical failures, so its accuracy number is a directional signal rather than a rigorous benchmark.
- The triage agent's confidence scores aren't well-calibrated: on the 24-case eval, the model was equally confident on its wrong answers as its right ones, so the confidence-gated reconsideration step never actually triggered — including on the cases it got wrong. A confidence threshold is only a useful "double-check this" signal if confidence tracks actual correctness, and here it doesn't. Improving this would likely need a different signal for triggering reconsideration (e.g. always reconsidering low-agreement or novel failure shapes, or calibrating confidence against a held-out labeled set) rather than trusting the model's self-reported number.
