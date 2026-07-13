import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { Project } from "@cms-manager/shared";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDeleteProject } from "@/api/projects";

interface DeleteProjectDialogProps {
  project: Project | null;
  onOpenChange: (open: boolean) => void;
  /** Navigate away after a successful delete — only needed from the project's own detail page. */
  redirectOnDelete?: boolean;
}

/**
 * Deleting a project is irreversible and destroys configuration + audit
 * history (Section 4.2) — requires typing the exact project name to
 * confirm, not just a click-through.
 */
export function DeleteProjectDialog({
  project,
  onOpenChange,
  redirectOnDelete,
}: DeleteProjectDialogProps) {
  const navigate = useNavigate();
  const deleteProject = useDeleteProject();
  const [confirmText, setConfirmText] = useState("");

  useEffect(() => {
    setConfirmText("");
  }, [project]);

  if (!project) return null;

  const canConfirm = confirmText === project.name;

  async function handleDelete(): Promise<void> {
    if (!project) return;
    try {
      await deleteProject.mutateAsync(project.id);
      toast.success(`"${project.name}" deleted.`);
      onOpenChange(false);
      if (redirectOnDelete) navigate("/projects");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not delete project.",
      );
    }
  }

  return (
    <AlertDialog open onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete "{project.name}"?</AlertDialogTitle>
          <AlertDialogDescription>
            This permanently deletes the project's configuration, members,
            and activity history. This cannot be undone. Type{" "}
            <span className="font-medium text-foreground">{project.name}</span>{" "}
            to confirm.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-2">
          <Label htmlFor="confirmName" className="sr-only">
            Project name
          </Label>
          <Input
            id="confirmName"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            autoComplete="off"
          />
        </div>

        <AlertDialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={!canConfirm || deleteProject.isPending}
            onClick={() => void handleDelete()}
          >
            {deleteProject.isPending && <Loader2 className="animate-spin" />}
            Delete project
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
