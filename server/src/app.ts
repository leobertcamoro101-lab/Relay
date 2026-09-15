import express, { Request, Response, NextFunction } from 'express';
import bodyParser from 'body-parser';
import helmet from 'helmet';
import mongoSanitize from "express-mongo-sanitize";
import logger from "./util/logger.js";
import * as Sentry from "@sentry/node";
import { pinoHttp } from "pino-http";   

import usersRoutes from './routes/users-routes.js';
import conversationsRoutes from './routes/conversations-routes.js';
import HttpError from './models/http-error.js';

const app = express();

app.use(pinoHttp({ logger }));

app.use(helmet());
app.use(bodyParser.json());

// app.use(mongoSanitize()); // commented and change compatibility issue express 5.x.x version

app.use((req, res, next) => {
  if (req.body) {
    req.body = mongoSanitize.sanitize(req.body);
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
  next();
});

app.use('/api/users', usersRoutes);
app.use('/api/conversations', conversationsRoutes);   // NEW

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

  const status = error.code || 500;

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
  res.json({ message: error.message || "An unknown error occurred" });
});

export default app;