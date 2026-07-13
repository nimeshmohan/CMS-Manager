import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { env } from "../config/env";
import { AppError } from "../utils/AppError";
import { logger } from "../utils/logger";

/**
 * Centralized error handler. Must be registered last, after all routes.
 * Zod validation errors and AppError instances are treated as safe to
 * report to the client; anything else is logged and masked in production
 * so internal details never leak to the frontend.
 */
export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof ZodError) {
    res.status(400).json({
      error: "ValidationError",
      message: "One or more fields are invalid.",
      fieldErrors: err.flatten().fieldErrors,
    });
    return;
  }

  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      logger.error(err.message, { stack: err.stack, path: req.path });
    }
    res.status(err.statusCode).json({
      error: err.name,
      message: err.message,
      ...(err.details ? { details: err.details } : {}),
    });
    return;
  }

  const message = err instanceof Error ? err.message : "Unknown error";
  logger.error(message, {
    stack: err instanceof Error ? err.stack : undefined,
    path: req.path,
  });

  res.status(500).json({
    error: "InternalServerError",
    message: env.isProduction
      ? "Something went wrong. Please try again."
      : message,
  });
}
