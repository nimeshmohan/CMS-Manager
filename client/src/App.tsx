import { Navigate, Route, Routes } from "react-router-dom";
import { AppProviders } from "@/providers/AppProviders";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { RequireSuperAdmin } from "@/components/RequireSuperAdmin";
import { AppLayout } from "@/components/layout/AppLayout";
import { LoginPage } from "@/pages/auth/LoginPage";
import { ForgotPasswordPage } from "@/pages/auth/ForgotPasswordPage";
import { SettingsPage } from "@/pages/SettingsPage";
import { ProfilePage } from "@/pages/ProfilePage";
import { ProjectsDashboardPage } from "@/pages/projects/ProjectsDashboardPage";
import { ProjectDetailPage } from "@/pages/projects/ProjectDetailPage";
import { ItemsListPage } from "@/pages/items/ItemsListPage";
import { ItemFormPage } from "@/pages/items/ItemFormPage";
import { InvitationAcceptPage } from "@/pages/invitations/InvitationAcceptPage";
import { ActivityLogPage } from "@/pages/activity/ActivityLogPage";

export default function App() {
  return (
    <AppProviders>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/invitations/:token" element={<InvitationAcceptPage />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            {/* Project Manager Dashboard (Section 4.2) — the landing page after login. */}
            <Route path="/" element={<Navigate to="/projects" replace />} />
            <Route path="/projects" element={<ProjectsDashboardPage />} />
            <Route path="/projects/:id" element={<ProjectDetailPage />} />
            <Route path="/projects/:id/collections/:collectionId" element={<ItemsListPage />} />
            <Route path="/projects/:id/collections/:collectionId/items/new" element={<ItemFormPage />} />
            <Route path="/projects/:id/collections/:collectionId/items/:itemId/edit" element={<ItemFormPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/settings" element={<SettingsPage />} />

            <Route element={<RequireSuperAdmin />}>
              <Route path="/activity-logs" element={<ActivityLogPage />} />
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppProviders>
  );
}
