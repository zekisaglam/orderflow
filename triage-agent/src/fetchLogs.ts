import { Client } from '@elastic/elasticsearch';
import dotenv from 'dotenv';

dotenv.config();

const esNode = process.env.ELASTICSEARCH_NODE || 'http://localhost:9200';
const client = new Client({ node: esNode });

const INDEX_PATTERN = 'orderflow-logs-*';

export type LogEntry = {
  timestamp: string;
  method: string;
  route: string;
  statusCode: number;
  role: string | null;
  clientId: string | null;
  errorMessage?: string;
};

type LogSource = {
  '@timestamp': string;
  fields?: {
    timestamp?: string;
    method?: string;
    route?: string;
    statusCode?: number;
    role?: string | null;
    clientId?: string | null;
    error?: string | null;
  };
};

export async function getLogsAroundTime(
  timestamp: string,
  windowSeconds: number = 30,
): Promise<LogEntry[]> {
  const center = new Date(timestamp).getTime();
  const gte = new Date(center - windowSeconds * 1000).toISOString();
  const lte = new Date(center + windowSeconds * 1000).toISOString();

  const response = await client.search<LogSource>({
    index: INDEX_PATTERN,
    size: 1000,
    sort: [{ '@timestamp': 'asc' }],
    query: {
      range: {
        '@timestamp': { gte, lte },
      },
    },
  });

  return response.hits.hits
    .map((hit) => hit._source)
    .filter((source): source is LogSource => source !== undefined)
    .map((source) => {
      const fields = source.fields ?? {};
      const entry: LogEntry = {
        timestamp: fields.timestamp ?? source['@timestamp'],
        method: fields.method ?? '',
        route: fields.route ?? '',
        statusCode: fields.statusCode ?? 0,
        role: fields.role ?? null,
        clientId: fields.clientId ?? null,
      };

      if (fields.error) {
        entry.errorMessage = fields.error;
      }

      return entry;
    });
}
