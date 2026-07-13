import { useState } from "react";
import { toast } from "sonner";
import { Copy, Plus, Trash2, UserCog } from "lucide-react";
import type { Project, ProjectInvitation, ProjectMember } from "@cms-manager/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { useAuth } from "@/providers/AuthProvider";
import { useMembers, useRevokeInvitation, useRevokeMember } from "@/api/members";
import { formatRelativeTime } from "@/lib/formatRelativeTime";
import { InviteMemberDialog } from "./InviteMemberDialog";
import { EditMemberDialog } from "./EditMemberDialog";

export function MembersSection({ project }: { project: Project }) {
  const { profile } = useAuth();
  const { data, isPending, isError } = useMembers(project.id, true);
  const revokeMember = useRevokeMember(project.id);
  const revokeInvitation = useRevokeInvitation(project.id);

  const [inviteOpen, setInviteOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<ProjectMember | null>(null);
  const [revokingMember, setRevokingMember] = useState<ProjectMember | null>(null);
  const [revokingInvitation, setRevokingInvitation] = useState<ProjectInvitation | null>(null);

  async function handleRevokeMember(): Promise<void> {
    if (!revokingMember) return;
    try {
      await revokeMember.mutateAsync(revokingMember.userId);
      toast.success(`Removed ${revokingMember.displayName} from this project.`);
      setRevokingMember(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not remove member.");
    }
  }

  async function handleRevokeInvitation(): Promise<void> {
    if (!revokingInvitation) return;
    try {
      await revokeInvitation.mutateAsync(revokingInvitation.id);
      toast.success("Invitation revoked.");
      setRevokingInvitation(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not revoke invitation.");
    }
  }

  async function handleCopyInviteLink(invitation: ProjectInvitation): Promise<void> {
    const url = `${window.location.origin}/invitations/${invitation.token}`;
    await navigator.clipboard.writeText(url);
    toast.success("Invitation link copied.");
  }

  return (
    <Card className="max-w-2xl">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-base">Members</CardTitle>
          <CardDescription>Who can access this project, and what they can do.</CardDescription>
        </div>
        <Button size="sm" onClick={() => setInviteOpen(true)}>
          <Plus />
          Invite
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {isPending && (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        )}

        {isError && (
          <p className="text-sm text-destructive">Could not load members.</p>
        )}

        {data && data.members.length === 0 && data.invitations.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No one else has access to this project yet.
          </p>
        )}

        {data?.members.map((member) => (
          <div
            key={member.userId}
            className="flex items-center justify-between rounded-md border px-3 py-2"
          >
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium">{member.displayName}</p>
                {member.isProjectManager && <Badge variant="default">Project Manager</Badge>}
                {member.userId === profile?.uid && (
                  <span className="text-xs text-muted-foreground">(you)</span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">{member.email}</p>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setEditingMember(member)}
              >
                <UserCog className="h-4 w-4" />
                <span className="sr-only">Edit access</span>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:text-destructive"
                onClick={() => setRevokingMember(member)}
              >
                <Trash2 className="h-4 w-4" />
                <span className="sr-only">Remove member</span>
              </Button>
            </div>
          </div>
        ))}

        {data && data.invitations.length > 0 && (
          <div className="space-y-2 pt-2">
            <p className="text-xs font-medium uppercase text-muted-foreground">
              Pending invitations
            </p>
            {data.invitations.map((invitation) => (
              <div
                key={invitation.id}
                className="flex items-center justify-between rounded-md border border-dashed px-3 py-2"
              >
                <div>
                  <p className="text-sm">{invitation.email}</p>
                  <p className="text-xs text-muted-foreground">
                    Invited by {invitation.invitedByEmail} &middot; expires{" "}
                    {formatRelativeTime(invitation.expiresAt)}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => void handleCopyInviteLink(invitation)}
                  >
                    <Copy className="h-4 w-4" />
                    <span className="sr-only">Copy invitation link</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => setRevokingInvitation(invitation)}
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="sr-only">Revoke invitation</span>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <InviteMemberDialog project={project} open={inviteOpen} onOpenChange={setInviteOpen} />

      {editingMember && (
        <EditMemberDialog
          project={project}
          member={editingMember}
          onOpenChange={(open) => !open && setEditingMember(null)}
        />
      )}

      <AlertDialog
        open={revokingMember !== null}
        onOpenChange={(open) => !open && setRevokingMember(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {revokingMember?.displayName}?</AlertDialogTitle>
            <AlertDialogDescription>
              They'll lose access to this project immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => void handleRevokeMember()}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={revokingInvitation !== null}
        onOpenChange={(open) => !open && setRevokingInvitation(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke this invitation?</AlertDialogTitle>
            <AlertDialogDescription>
              {revokingInvitation?.email} won't be able to use this invitation link anymore.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleRevokeInvitation()}>
              Revoke
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
