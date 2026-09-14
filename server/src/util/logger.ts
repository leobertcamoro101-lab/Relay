import { pino } from "pino";

const isProduction = process.env.NODE_ENV === "production";

// Plain JSON logger — no transport configured here. Piping through
// pino-pretty happens via the npm script itself (see package.json) rather
// than pino's built-in worker-thread transport, which had module
// resolution issues under ts-node-dev's transpile-only mode.
const logger = pino({
  level: process.env.LOG_LEVEL || (isProduction ? "info" : "debug"),
  redact: {                                              // ADD THIS BLOCK
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      'res.headers["set-cookie"]',
    ],
    censor: "[Redacted]",
  },
});

export default logger;