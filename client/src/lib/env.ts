const REQUIRED_KEYS = [
  "VITE_FIREBASE_API_KEY",
  "VITE_FIREBASE_AUTH_DOMAIN",
  "VITE_FIREBASE_PROJECT_ID",
  "VITE_FIREBASE_STORAGE_BUCKET",
  "VITE_FIREBASE_MESSAGING_SENDER_ID",
  "VITE_FIREBASE_APP_ID",
  "VITE_API_BASE_URL",
] as const satisfies readonly (keyof ImportMetaEnv)[];

for (const key of REQUIRED_KEYS) {
  if (!import.meta.env[key]) {
    // Fail fast with a clear message instead of a cryptic Firebase error later.
    throw new Error(
      `Missing required environment variable: ${key}. Check client/.env against client/.env.example.`,
    );
  }
}

export const env = {
  firebase: {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
  },
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL,
} as const;
