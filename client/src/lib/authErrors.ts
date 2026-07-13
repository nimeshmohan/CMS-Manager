const FIREBASE_AUTH_ERROR_MESSAGES: Record<string, string> = {
  "auth/invalid-credential": "Incorrect email or password.",
  "auth/invalid-email": "Enter a valid email address.",
  "auth/user-not-found": "Incorrect email or password.",
  "auth/wrong-password": "Incorrect email or password.",
  "auth/user-disabled":
    "This account has been disabled. Contact an administrator.",
  "auth/too-many-requests":
    "Too many attempts. Please wait a moment and try again.",
  "auth/network-request-failed":
    "Network error. Check your connection and try again.",
  "auth/requires-recent-login": "Please sign out and back in, then try again.",
  "auth/weak-password": "Choose a stronger password (at least 8 characters).",
};

function isFirebaseAuthError(error: unknown): error is { code: string } {
  return typeof error === "object" && error !== null && "code" in error;
}

export function getAuthErrorMessage(error: unknown): string {
  if (isFirebaseAuthError(error)) {
    return (
      FIREBASE_AUTH_ERROR_MESSAGES[error.code] ??
      "Something went wrong. Please try again."
    );
  }
  return "Something went wrong. Please try again.";
}
