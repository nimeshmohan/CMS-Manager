import { Router } from "express";

export const healthRouter = Router();

/** Used by Render's health check and for local sanity checks. Intentionally unauthenticated. */
healthRouter.get("/", (_req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});
