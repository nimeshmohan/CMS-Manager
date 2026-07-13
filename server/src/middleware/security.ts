import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { env } from "../config/env";

export const helmetMiddleware = helmet();

export const corsMiddleware = cors({
  origin: env.clientOrigin,
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
});

/** General-purpose limiter applied to all /api routes. */
export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "TooManyRequests",
    message: "Too many requests. Please try again later.",
  },
});

/** Stricter limiter for sensitive mutating endpoints (invitations, password resets, credential/permission changes). */
export const sensitiveActionRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "TooManyRequests",
    message: "Too many attempts. Please wait before trying again.",
  },
});
