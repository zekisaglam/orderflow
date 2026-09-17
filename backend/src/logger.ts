import winston from 'winston';
import { ElasticsearchTransport } from 'winston-elasticsearch';

const esNode = process.env.ELASTICSEARCH_NODE || 'http://localhost:9200';

export const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(winston.format.colorize(), winston.format.simple()),
    }),
    new ElasticsearchTransport({
      level: 'info',
      indexPrefix: 'orderflow-logs',
      clientOpts: { node: esNode },
    }),
  ],
});
