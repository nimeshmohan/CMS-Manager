import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  browserLocalPersistence,
  browserSessionPersistence,
  onAuthStateChanged,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
  type User as FirebaseUser,
} from "firebase/auth";
import type { AppUser, Membership } from "@cms-manager/shared";
import { firebaseAuth } from "@/lib/firebase";
import { apiClient } from "@/lib/apiClient";
import { getAuthErrorMessage } from "@/lib/authErrors";

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

interface AuthContextValue {
  status: AuthStatus;
  firebaseUser: FirebaseUser | null;
  profile: AppUser | null;
  /** The caller's resolved project Memberships (Section 15) — empty for Super Admins, whose access instead comes from `profile.isSuperAdmin`. Drives `usePermissions`. */
  memberships: Membership[];
  login: (
    email: string,
    password: string,
    rememberMe: boolean,
  ) => Promise<void>;
  logout: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<AppUser | null>(null);
  const [memberships, setMemberships] = useState<Membership[]>([]);

  async function loadProfile(): Promise<void> {
    try {
      const me = await apiClient.get<{ user: AppUser; memberships: Membership[] }>(
        "/api/me",
      );
      setProfile(me.user);
      setMemberships(me.memberships);
      setStatus("authenticated");
    } catch {
      // Firestore profile missing, or the account was disabled server-side —
      // either way this session is not valid for the app.
      await signOut(firebaseAuth);
      setProfile(null);
      setMemberships([]);
      setStatus("unauthenticated");
    }
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(firebaseAuth, (user) => {
      setFirebaseUser(user);
      if (user) {
        void loadProfile();
      } else {
        setProfile(null);
        setMemberships([]);
        setStatus("unauthenticated");
      }
    });
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function login(
    email: string,
    password: string,
    rememberMe: boolean,
  ): Promise<void> {
    await setPersistence(
      firebaseAuth,
      rememberMe ? browserLocalPersistence : browserSessionPersistence,
    );
    try {
      await signInWithEmailAndPassword(firebaseAuth, email, password);
    } catch (error) {
      throw new Error(getAuthErrorMessage(error));
    }
  }

  async function logout(): Promise<void> {
    await signOut(firebaseAuth);
  }

  async function sendPasswordReset(email: string): Promise<void> {
    try {
      await sendPasswordResetEmail(firebaseAuth, email);
    } catch (error) {
      throw new Error(getAuthErrorMessage(error));
    }
  }

  return (
    <AuthContext.Provider
      value={{
        status,
        firebaseUser,
        profile,
        memberships,
        login,
        logout,
        sendPasswordReset,
        refreshProfile: loadProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
