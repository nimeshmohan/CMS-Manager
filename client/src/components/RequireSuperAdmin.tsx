import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/providers/AuthProvider";

/**
 * Guards a route (and its nested routes) to Super Admins. Must run inside
 * ProtectedRoute. Checks the resolved `isSuperAdmin` boolean directly —
 * never a role name — per Section 3.2's authorization rule.
 */
export function RequireSuperAdmin() {
  const { profile } = useAuth();

  if (!profile?.isSuperAdmin) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
