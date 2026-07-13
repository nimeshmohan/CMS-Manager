import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { env } from "./env";

export const firebaseApp = initializeApp(env.firebase);
export const firebaseAuth = getAuth(firebaseApp);
