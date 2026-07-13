import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FormError } from "@/components/ui/form-error";
import { firebaseAuth } from "@/lib/firebase";
import { getAuthErrorMessage } from "@/lib/authErrors";
import { useAuth } from "@/providers/AuthProvider";
import { useInvitationPreview, useAcceptInvitation } from "@/api/invitations";

const createAccountSchema = z
  .object({
    displayName: z.string().trim().min(1, "Your name is required").max(120),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });
type CreateAccountValues = z.infer<typeof createAccountSchema>;

const loginSchema = z.object({
  password: z.string().min(1, "Password is required"),
});
type LoginValues = z.infer<typeof loginSchema>;

export function InvitationAcceptPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { status, profile, login, logout, refreshProfile } = useAuth();
  const { data: preview, isPending, isError } = useInvitationPreview(token);
  const acceptInvitation = useAcceptInvitation(token);

  const [mode, setMode] = useState<"create" | "login">("create");
  const [formError, setFormError] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);

  const createForm = useForm<CreateAccountValues>({
    resolver: zodResolver(createAccountSchema),
    defaultValues: { displayName: "", password: "", confirmPassword: "" },
  });
  const loginForm = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { password: "" },
  });

  async function finishAccepting(displayName?: string): Promise<void> {
    if (!token) return;
    setAccepting(true);
    try {
      const result = await acceptInvitation.mutateAsync(displayName);
      await refreshProfile();
      toast.success("You're in!");
      navigate(`/projects/${result.projectId}`, { replace: true });
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : "Could not accept this invitation.",
      );
      setAccepting(false);
    }
  }

  async function handleCreateAccount(values: CreateAccountValues): Promise<void> {
    if (!preview) return;
    setFormError(null);
    try {
      await createUserWithEmailAndPassword(firebaseAuth, preview.email, values.password);
    } catch (error) {
      setFormError(getAuthErrorMessage(error));
      return;
    }
    await finishAccepting(values.displayName);
  }

  async function handleLogin(values: LoginValues): Promise<void> {
    if (!preview) return;
    setFormError(null);
    try {
      await login(preview.email, values.password, true);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Could not log in.");
      return;
    }
    await finishAccepting();
  }

  if (isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError || !preview) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle>Invitation not found</CardTitle>
            <CardDescription>
              This invitation link is invalid, has expired, or was already used.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const alreadyLoggedInAsInvitee =
    status === "authenticated" && profile?.email.toLowerCase() === preview.email.toLowerCase();
  const alreadyLoggedInAsSomeoneElse = status === "authenticated" && !alreadyLoggedInAsInvitee;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>You've been invited</CardTitle>
          <CardDescription>
            {preview.invitedByEmail} invited you to join{" "}
            <span className="font-medium text-foreground">{preview.projectName}</span> as{" "}
            {preview.roleName}.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {alreadyLoggedInAsSomeoneElse && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                You're signed in as <span className="font-medium">{profile?.email}</span>, but
                this invitation is for <span className="font-medium">{preview.email}</span>.
              </p>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => void logout()}
              >
                Log out and try again
              </Button>
            </div>
          )}

          {alreadyLoggedInAsInvitee && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Signed in as {profile?.email}.
              </p>
              <FormError message={formError ?? undefined} />
              <Button
                className="w-full"
                disabled={accepting}
                onClick={() => void finishAccepting()}
              >
                {accepting && <Loader2 className="animate-spin" />}
                Accept invitation
              </Button>
            </div>
          )}

          {status === "unauthenticated" && (
            <div className="space-y-4">
              <div className="flex gap-1 rounded-md bg-muted p-1 text-sm">
                <button
                  type="button"
                  className={`flex-1 rounded px-3 py-1.5 ${mode === "create" ? "bg-background shadow-sm" : "text-muted-foreground"}`}
                  onClick={() => setMode("create")}
                >
                  Create account
                </button>
                <button
                  type="button"
                  className={`flex-1 rounded px-3 py-1.5 ${mode === "login" ? "bg-background shadow-sm" : "text-muted-foreground"}`}
                  onClick={() => setMode("login")}
                >
                  Log in
                </button>
              </div>

              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={preview.email} disabled />
              </div>

              {mode === "create" ? (
                <form
                  onSubmit={createForm.handleSubmit(handleCreateAccount)}
                  noValidate
                  className="space-y-4"
                >
                  <div className="space-y-2">
                    <Label htmlFor="displayName">Your name</Label>
                    <Input id="displayName" {...createForm.register("displayName")} />
                    <FormError message={createForm.formState.errors.displayName?.message} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="createPassword">Password</Label>
                    <Input
                      id="createPassword"
                      type="password"
                      autoComplete="new-password"
                      {...createForm.register("password")}
                    />
                    <FormError message={createForm.formState.errors.password?.message} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm password</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      autoComplete="new-password"
                      {...createForm.register("confirmPassword")}
                    />
                    <FormError message={createForm.formState.errors.confirmPassword?.message} />
                  </div>
                  <FormError message={formError ?? undefined} />
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={createForm.formState.isSubmitting || accepting}
                  >
                    {(createForm.formState.isSubmitting || accepting) && (
                      <Loader2 className="animate-spin" />
                    )}
                    Create account & join
                  </Button>
                </form>
              ) : (
                <form
                  onSubmit={loginForm.handleSubmit(handleLogin)}
                  noValidate
                  className="space-y-4"
                >
                  <div className="space-y-2">
                    <Label htmlFor="loginPassword">Password</Label>
                    <Input
                      id="loginPassword"
                      type="password"
                      autoComplete="current-password"
                      {...loginForm.register("password")}
                    />
                    <FormError message={loginForm.formState.errors.password?.message} />
                  </div>
                  <FormError message={formError ?? undefined} />
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={loginForm.formState.isSubmitting || accepting}
                  >
                    {(loginForm.formState.isSubmitting || accepting) && (
                      <Loader2 className="animate-spin" />
                    )}
                    Log in & join
                  </Button>
                </form>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
