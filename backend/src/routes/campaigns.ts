import { Router } from 'express';
import { isValidObjectId } from 'mongoose';
import { Campaign } from '../models/Campaign';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.post('/', async (req, res) => {
  try {
    const campaign = await Campaign.create({
      ...req.body,
      clientId: req.user!.clientId,
    });
    res.status(201).json(campaign);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

// Returns the default if the param is absent, null if it's present but not a positive integer.
function parsePositiveInt(value: unknown, defaultValue: number): number | null {
  if (value === undefined) return defaultValue;
  if (typeof value !== 'string' || !/^\d+$/.test(value)) return null;
  const n = Number(value);
  return Number.isSafeInteger(n) && n > 0 ? n : null;
}

router.get('/', async (req, res) => {
  const page = parsePositiveInt(req.query.page, DEFAULT_PAGE);
  if (page === null) {
    return res.status(400).json({ error: 'page must be a positive integer' });
  }
  const requestedLimit = parsePositiveInt(req.query.limit, DEFAULT_LIMIT);
  if (requestedLimit === null) {
    return res.status(400).json({ error: 'limit must be a positive integer' });
  }
  const limit = Math.min(requestedLimit, MAX_LIMIT);

  const filter = req.user!.role === 'admin' ? {} : { clientId: req.user!.clientId ?? null };
  const campaigns = await Campaign.find(filter)
    .sort({ _id: 1 })
    .skip((page - 1) * limit)
    .limit(limit);
  res.json({ page, limit, campaigns });
});

router.delete('/:id', async (req, res) => {
  const id = String(req.params.id);
  if (!isValidObjectId(id)) {
    return res.status(404).json({ error: 'Campaign not found' });
  }

  // Same scoping as GET: clients can only delete their own campaigns, so someone
  // else's campaign is indistinguishable from a missing one (404, not 403).
  const scope = req.user!.role === 'admin' ? {} : { clientId: req.user!.clientId ?? null };
  const deleted = await Campaign.findOneAndDelete({ _id: id, ...scope });
  if (!deleted) {
    return res.status(404).json({ error: 'Campaign not found' });
  }
  res.status(204).end();
});

export default router;
