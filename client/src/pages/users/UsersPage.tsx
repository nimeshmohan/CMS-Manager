import { useState } from "react";
import { toast } from "sonner";
import { Copy, Key, MoreHorizontal, ShieldCheck, ShieldOff, Trash2 } from "lucide-react";
import type { AppUser } from "@cms-manager/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/providers/AuthProvider";
import { formatRelativeTime } from "@/lib/formatRelativeTime";
import { useDeleteUser, useResetUserPassword, useUpdateUser, useUsers } from "@/api/users";

/**
 * Platform-wide, Super Admin only (Section 15) — guarded by
 * `RequireSuperAdmin` at the route level. There's no "create user" here:
 * Section 8 forbids open self-registration, and Invitation has no concept
 * of granting Super Admin — every account starts via the bootstrap script
 * or by accepting a project invitation.
 */
export function UsersPage() {
  const { profile } = useAuth();
  const { data: users, isPending, isError } = useUsers();
  const updateUser = useUpdateUser();
  const deleteUser = useDeleteUser();
  const resetPassword = useResetUserPassword();

  const [deletingUser, setDeletingUser] = useState<AppUser | null>(null);
  const [resetUrl, setResetUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleToggleSuperAdmin(user: AppUser): Promise<void> {
    try {
      await updateUser.mutateAsync({ uid: user.uid, isSuperAdmin: !user.isSuperAdmin });
      toast.success(
        user.isSuperAdmin ? `Removed Super Admin from ${user.email}.` : `Made ${user.email} a Super Admin.`,
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update user.");
    }
  }

  async function handleToggleDisabled(user: AppUser): Promise<void> {
    try {
      await updateUser.mutateAsync({ uid: user.uid, disabled: !user.disabled });
      toast.success(user.disabled ? `Enabled ${user.email}.` : `Disabled ${user.email}.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update user.");
    }
  }

  async function handleResetPassword(user: AppUser): Promise<void> {
    try {
      const result = await resetPassword.mutateAsync(user.uid);
      setResetUrl(result.resetUrl);
      setCopied(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not generate reset link.");
    }
  }

  async function handleDelete(): Promise<void> {
    if (!deletingUser) return;
    try {
      await deleteUser.mutateAsync(deletingUser.uid);
      toast.success(`Deleted ${deletingUser.email}.`);
      setDeletingUser(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete user.");
    }
  }

  async function handleCopyResetUrl(): Promise<void> {
    if (!resetUrl) return;
    await navigator.clipboard.writeText(resetUrl);
    setCopied(true);
    toast.success("Link copied.");
  }

  return (
    <div className="flex-1 space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
        <p className="text-sm text-muted-foreground">
          Every account on the platform, across every project.
        </p>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isPending ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 4 }).map((__, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-5 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : isError ? (
              <TableRow>
                <TableCell colSpan={4} className="py-10 text-center text-sm text-muted-foreground">
                  Could not load users.
                </TableCell>
              </TableRow>
            ) : (
              users?.map((user) => {
                const isSelf = user.uid === profile?.uid;
                return (
                  <TableRow key={user.uid}>
                    <TableCell>
                      <p className="font-medium">{user.displayName}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {user.isSuperAdmin && <Badge variant="default">Super Admin</Badge>}
                        {user.disabled && <Badge variant="destructive">Disabled</Badge>}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatRelativeTime(user.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal />
                            <span className="sr-only">Open actions</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => void handleToggleSuperAdmin(user)}>
                            {user.isSuperAdmin ? <ShieldOff /> : <ShieldCheck />}
                            {user.isSuperAdmin ? "Remove Super Admin" : "Make Super Admin"}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            disabled={isSelf}
                            onClick={() => void handleToggleDisabled(user)}
                          >
                            {user.disabled ? <ShieldCheck /> : <ShieldOff />}
                            {user.disabled ? "Enable" : "Disable"}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => void handleResetPassword(user)}>
                            <Key />
                            Send password reset
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            disabled={isSelf}
                            className="text-destructive focus:text-destructive"
                            onClick={() => setDeletingUser(user)}
                          >
                            <Trash2 />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={deletingUser !== null} onOpenChange={(open) => !open && setDeletingUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deletingUser?.email}?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes their account and removes them from every project. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteUser.isPending}
              onClick={() => void handleDelete()}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={resetUrl !== null} onOpenChange={(open) => !open && setResetUrl(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Password reset link</DialogTitle>
            <DialogDescription>
              No email provider is configured yet — share this link with them directly.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2">
            <Input readOnly value={resetUrl ?? ""} className="font-mono text-xs" />
            <Button type="button" variant="outline" onClick={() => void handleCopyResetUrl()}>
              <Copy />
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
          <DialogFooter>
            <Button onClick={() => setResetUrl(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
