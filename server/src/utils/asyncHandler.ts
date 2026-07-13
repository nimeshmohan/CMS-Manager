import type { NextFunction, Request, RequestHandler, Response } from "express";

/**
 * Wraps an async route/middleware handler so rejected promises are forwarded
 * to Express's error handling pipeline instead of becoming unhandled
 * rejections. Avoids repeating try/catch in every route.
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
): RequestHandler {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
}
