import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
} from "firebase/auth";
import { firebaseAuth } from "./firebase";
import { getAuthErrorMessage } from "./authErrors";

/** Self-service password change for the currently signed-in user (requires their current password). */
export async function changeOwnPassword(
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  const user = firebaseAuth.currentUser;
  if (!user || !user.email) {
    throw new Error("You must be signed in to change your password.");
  }

  try {
    const credential = EmailAuthProvider.credential(
      user.email,
      currentPassword,
    );
    await reauthenticateWithCredential(user, credential);
    await updatePassword(user, newPassword);
  } catch (error) {
    throw new Error(getAuthErrorMessage(error));
  }
}
