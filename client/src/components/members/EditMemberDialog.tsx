import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import type {
  CollectionConfig,
  CollectionPermission,
  CollectionPermissionKey,
  Project,
  ProjectMember,
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
import { useUpdateMemberPermissions } from "@/api/members";
import { MemberPermissionMatrix } from "./MemberPermissionMatrix";

interface EditMemberDialogProps {
  project: Project;
  member: ProjectMember;
  onOpenChange: (open: boolean) => void;
}

function grantsFromMember(member: ProjectMember): Record<string, CollectionPermission> {
  return Object.fromEntries(member.collectionPermissions.map((p) => [p.collectionId, p]));
}

/** Edits an already-accepted Membership's per-collection permissions "at any time" (Section 3.4) — takes effect on the member's very next request. */
export function EditMemberDialog({ project, member, onOpenChange }: EditMemberDialogProps) {
  const updatePermissions = useUpdateMemberPermissions(project.id);
  const [grants, setGrants] = useState<Record<string, CollectionPermission>>(
    () => grantsFromMember(member),
  );

  function handleToggleCollection(collection: CollectionConfig): void {
    setGrants((prev) => {
      if (prev[collection.id]) {
        const next = { ...prev };
        delete next[collection.id];
        return next;
      }
      return {
        ...prev,
        [collection.id]: {
          collectionId: collection.id,
          canView: true,
          canCreate: false,
          canEdit: false,
          canDelete: false,
          canPublish: false,
        },
      };
    });
  }

  function handleTogglePermission(collectionId: string, key: CollectionPermissionKey): void {
    setGrants((prev) => {
      const grant = prev[collectionId];
      if (!grant) return prev;
      return { ...prev, [collectionId]: { ...grant, [key]: !grant[key] } };
    });
  }

  async function handleSave(): Promise<void> {
    try {
      await updatePermissions.mutateAsync({
        membershipId: member.userId,
        collectionPermissions: Object.values(grants),
      });
      toast.success(`Updated ${member.displayName}'s access.`);
      onOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not update permissions.",
      );
    }
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit access — {member.displayName}</DialogTitle>
          <DialogDescription>{member.email}</DialogDescription>
        </DialogHeader>

        <MemberPermissionMatrix
          collections={project.collections}
          grants={grants}
          onToggleCollection={handleToggleCollection}
          onTogglePermission={handleTogglePermission}
        />

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={updatePermissions.isPending} onClick={() => void handleSave()}>
            {updatePermissions.isPending && <Loader2 className="animate-spin" />}
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
