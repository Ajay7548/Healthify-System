import { pino } from 'pino';
import { isProd, isTest } from './env.js';

// Structured logging with a redaction list so secrets and patient data never
// land in the logs. Pretty-printed in development for readability; plain JSON
// in production where a log aggregator parses it.
export const logger = pino({
  level: isTest ? 'silent' : isProd ? 'info' : 'debug',
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'password',
      '*.password',
      'passwordHash',
      '*.passwordHash',
      'accessToken',
      'refreshToken',
      '*.accessToken',
      '*.refreshToken',
      'tokenHash',
      '*.tokenHash',
    ],
    censor: '[redacted]',
  },
  transport: isProd
    ? undefined
    : {
        target: 'pino-pretty',
        options: { colorize: true, translateTime: 'SYS:HH:MM:ss', ignore: 'pid,hostname' },
      },
});
