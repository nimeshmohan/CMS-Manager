import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { Project } from "@cms-manager/shared";
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
import { useDuplicateProject } from "@/api/projects";

const duplicateSchema = z.object({
  name: z.string().trim().min(1, "Project name is required").max(120),
});
type DuplicateFormValues = z.infer<typeof duplicateSchema>;

interface DuplicateProjectDialogProps {
  project: Project | null;
  onOpenChange: (open: boolean) => void;
}

/** Clones configuration under a new name — not items, memberships, activity log, or the CMS connection (Section 4.2). */
export function DuplicateProjectDialog({
  project,
  onOpenChange,
}: DuplicateProjectDialogProps) {
  const navigate = useNavigate();
  const duplicateProject = useDuplicateProject();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<DuplicateFormValues>({
    resolver: zodResolver(duplicateSchema),
    defaultValues: { name: "" },
  });

  useEffect(() => {
    if (project) reset({ name: `${project.name} (copy)` });
  }, [project, reset]);

  if (!project) return null;

  async function onSubmit(values: DuplicateFormValues): Promise<void> {
    if (!project) return;
    try {
      const { project: duplicate } = await duplicateProject.mutateAsync({
        id: project.id,
        name: values.name,
      });
      toast.success(`"${duplicate.name}" created.`);
      onOpenChange(false);
      navigate(`/projects/${duplicate.id}`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not duplicate project.",
      );
    }
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Duplicate "{project.name}"</DialogTitle>
          <DialogDescription>
            Copies this project's configuration and collection setup — not
            its items, members, or activity log. You'll need to reconnect
            the CMS credentials for the new project.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="duplicateName">New project name</Label>
            <Input id="duplicateName" {...register("name")} />
            <FormError message={errors.name?.message} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="animate-spin" />}
              Duplicate
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
