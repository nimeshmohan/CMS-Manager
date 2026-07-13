import { useState } from "react";
import { toast } from "sonner";
import { Check, Copy, Loader2 } from "lucide-react";
import {
  SEEDED_ROLE_IDS,
  type CollectionConfig,
  type CollectionPermission,
  type CollectionPermissionKey,
  type Project,
} from "@cms-manager/shared";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormError } from "@/components/ui/form-error";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRoles } from "@/api/roles";
import { useInviteMember } from "@/api/members";
import { MemberPermissionMatrix } from "./MemberPermissionMatrix";

interface InviteMemberDialogProps {
  project: Project;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function defaultGrant(
  collectionId: string,
  template: Omit<CollectionPermission, "collectionId">,
): CollectionPermission {
  return { collectionId, ...template };
}

/** No email provider is wired up yet — inviting shows a copyable accept link instead of "email sent" (Section 12). */
export function InviteMemberDialog({ project, open, onOpenChange }: InviteMemberDialogProps) {
  const { data: roles } = useRoles();
  const inviteMember = useInviteMember(project.id);

  const [email, setEmail] = useState("");
  const [roleId, setRoleId] = useState("");
  const [grants, setGrants] = useState<Record<string, CollectionPermission>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [acceptUrl, setAcceptUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const selectedRole = roles?.find((r) => r.id === roleId);

  function resetForm(): void {
    setEmail("");
    setRoleId("");
    setGrants({});
    setFormError(null);
    setAcceptUrl(null);
    setCopied(false);
  }

  function handleOpenChange(next: boolean): void {
    if (!next) resetForm();
    onOpenChange(next);
  }

  function handleRoleChange(nextRoleId: string): void {
    setRoleId(nextRoleId);
    const role = roles?.find((r) => r.id === nextRoleId);
    if (!role) return;
    // Re-applies the new role's template to every already-selected collection — still fully editable after (Section 3.2).
    setGrants((prev) => {
      const next: Record<string, CollectionPermission> = {};
      for (const collectionId of Object.keys(prev)) {
        next[collectionId] = defaultGrant(collectionId, role.defaultPermissionTemplate);
      }
      return next;
    });
  }

  function handleToggleCollection(collection: CollectionConfig): void {
    setGrants((prev) => {
      if (prev[collection.id]) {
        const next = { ...prev };
        delete next[collection.id];
        return next;
      }
      const template = selectedRole?.defaultPermissionTemplate ?? {
        canView: true,
        canCreate: false,
        canEdit: false,
        canDelete: false,
        canPublish: false,
      };
      return { ...prev, [collection.id]: defaultGrant(collection.id, template) };
    });
  }

  function handleTogglePermission(collectionId: string, key: CollectionPermissionKey): void {
    setGrants((prev) => {
      const grant = prev[collectionId];
      if (!grant) return prev;
      return { ...prev, [collectionId]: { ...grant, [key]: !grant[key] } };
    });
  }

  async function handleSubmit(): Promise<void> {
    setFormError(null);
    if (!email.trim()) {
      setFormError("Email is required.");
      return;
    }
    if (!roleId) {
      setFormError("Select a role.");
      return;
    }
    if (Object.keys(grants).length === 0) {
      setFormError("Select at least one collection.");
      return;
    }

    try {
      const result = await inviteMember.mutateAsync({
        email,
        roleId,
        isProjectManager: roleId === SEEDED_ROLE_IDS.PROJECT_MANAGER,
        collectionPermissions: Object.values(grants),
      });
      setAcceptUrl(result.acceptUrl);
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : "Could not send invitation.",
      );
    }
  }

  async function handleCopy(): Promise<void> {
    if (!acceptUrl) return;
    await navigator.clipboard.writeText(acceptUrl);
    setCopied(true);
    toast.success("Link copied.");
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Invite a member</DialogTitle>
          <DialogDescription>
            No email provider is configured yet — you'll get a link to share
            with them directly.
          </DialogDescription>
        </DialogHeader>

        {acceptUrl ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Invitation created for <span className="font-medium text-foreground">{email}</span>.
              Share this link with them — it expires in 7 days.
            </p>
            <div className="flex gap-2">
              <Input readOnly value={acceptUrl} className="font-mono text-xs" />
              <Button type="button" variant="outline" onClick={() => void handleCopy()}>
                {copied ? <Check /> : <Copy />}
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>
            <DialogFooter>
              <Button onClick={() => handleOpenChange(false)}>Done</Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="inviteEmail">Email</Label>
              <Input
                id="inviteEmail"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={roleId} onValueChange={handleRoleChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  {roles?.map((role) => (
                    <SelectItem key={role.id} value={role.id}>
                      {role.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Collections & permissions</Label>
              <MemberPermissionMatrix
                collections={project.collections}
                grants={grants}
                onToggleCollection={handleToggleCollection}
                onTogglePermission={handleTogglePermission}
              />
            </div>

            <FormError message={formError ?? undefined} />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                disabled={inviteMember.isPending}
                onClick={() => void handleSubmit()}
              >
                {inviteMember.isPending && <Loader2 className="animate-spin" />}
                Send invitation
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
