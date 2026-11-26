import express, { Request, Response, NextFunction } from 'express';
import bodyParser from 'body-parser';
import helmet from 'helmet';
import mongoSanitize from "express-mongo-sanitize";
import logger from "./util/logger.js";
import * as Sentry from "@sentry/node";
import { pinoHttp } from "pino-http";

import usersRoutes from './routes/users-routes.js';
import conversationsRoutes from './routes/conversations-routes.js';
import uploadRoutes from './routes/upload-routes.js'; // NEW
import HttpError from './models/http-error.js';
import { toErrorResponse } from "./util/error-response.js";

const app = express();
app.set("trust proxy", 1);

app.use(pinoHttp({ logger }));

app.use(helmet());
app.use(bodyParser.json());

// app.use(mongoSanitize()); // commented and change compatibility issue express 5.x.x version

app.use((req, res, next) => {
  if (req.body) {
    req.body = mongoSanitize.sanitize(req.body);
  }
  if (req.params) {
    const sanitized = mongoSanitize.sanitize(req.params);
    for (const key of Object.keys(sanitized)) {
      (req.params as any)[key] = sanitized[key];
    }
  }
  if (req.query) {
    const sanitized = mongoSanitize.sanitize(req.query);
    for (const key of Object.keys(sanitized)) {
      (req.query as any)[key] = sanitized[key];
    }
  }
  next();
});

// CORS Policy
const allowedOrigins = [
  "http://localhost:5173",
  process.env.FRONTEND_URL,
];

app.use((req: Request, res: Response, next: NextFunction) => {
  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE");
  // NEW — a preflight OPTIONS request matches no actual route below (they're
  // all registered for specific methods), so without this it fell through
  // to the 404 handler. Browsers require a genuine 2xx on the preflight
  // itself; a 404 there makes the browser abort the real request as a CORS
  // failure, which surfaces to JS only as a generic "Failed to fetch" with
  // no further detail. This affects every Authorization-header request, not
  // just the new upload route.
  if (req.method === "OPTIONS") {
    res.sendStatus(204);
    return;
  }
  next();
});

app.use('/api/users', usersRoutes);
app.use('/api/conversations', conversationsRoutes);   // NEW
app.use('/api/upload', uploadRoutes);   // NEW

// for Sentry testing only
// app.get("/debug-sentry", () => {
//   throw new Error("My first Sentry error!");
// });

// unknown routes middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const error = new HttpError("Could not find this route.", 404);
  throw error;
});

// error handling middleware
app.use((error: any, req: Request, res: Response, next: NextFunction) => {
  if (res.headersSent) {
    return next(error);
  }

  // What the client sees: the message only for user-facing errors, a generic
  // one for everything else (see util/error-response.ts).
  const { status, message } = toErrorResponse(error);

  // Log every server-side error with useful request context. Client
  // errors (4xx — bad input, auth failures, not found) are expected,
  // routine traffic and not logged as errors to avoid noise; anything
  // 5xx means something actually went wrong and is worth seeing.
  if (status >= 500) {
    logger.error(
      { err: error, method: req.method, path: req.path, status },
      "Request failed"
    );
    Sentry.captureException(error);
  }

  res.status(status);
  res.json({ message });
});

export default app;
