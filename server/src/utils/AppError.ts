/**
 * Thrown for any expected/operational failure (bad input, not found,
 * forbidden, upstream provider error, etc). The centralized error handler
 * treats instances of this class as "safe to show the message to the
 * client"; anything else is logged and masked in production.
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly details?: unknown;

  constructor(message: string, statusCode = 500, details?: unknown) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}
