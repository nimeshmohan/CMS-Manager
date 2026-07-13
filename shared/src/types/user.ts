/**
 * Application user profile, stored in Firestore and keyed by Firebase Auth
 * uid. `isSuperAdmin` is the platform-wide tier of authority (Section 3.1);
 * everything else about what a user can do is resolved per-project from
 * their Membership records, never from a field on this type.
 */
export interface AppUser {
  uid: string;
  email: string;
  displayName: string;
  isSuperAdmin: boolean;
  disabled: boolean;
  createdAt: string;
  createdBy: string;
}
