import { env } from "./config/env";
// Importing for its side effect: initializes Firebase Admin at boot so a
// misconfigured service account fails the deploy immediately, not on the
// first request that happens to touch Firestore/Auth.
import "./config/firebaseAdmin";
import { createApp } from "./app";
import { logger } from "./utils/logger";

const app = createApp();

app.listen(env.port, () => {
  logger.info(`CMS Manager server listening on port ${env.port}`, {
    env: env.nodeEnv,
  });
});
