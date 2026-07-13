import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { Project } from "@cms-manager/shared";
import { createProjectSchema } from "@cms-manager/shared";
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
import { Textarea } from "@/components/ui/textarea";
import { FormError } from "@/components/ui/form-error";
import { useCreateProject, useUpdateProject } from "@/api/projects";

const formSchema = createProjectSchema.extend({
  logoUrl: z
    .union([z.string().trim().url("Enter a valid URL"), z.literal("")])
    .optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface ProjectFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Present for edit mode; absent for create. */
  project?: Project;
}

/**
 * Basic-information fields only (Section 4.4 step 1) — connecting Webflow,
 * selecting collections, and field mapping are a separate flow that
 * operates on an already-created project, added once the CmsProvider
 * abstraction exists.
 */
export function ProjectFormDialog({
  open,
  onOpenChange,
  project,
}: ProjectFormDialogProps) {
  const isEdit = Boolean(project);
  const navigate = useNavigate();
  const createProject = useCreateProject();
  const updateProject = useUpdateProject(project?.id ?? "");
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: "", clientName: "", description: "", logoUrl: "" },
  });

  useEffect(() => {
    if (open) {
      reset({
        name: project?.name ?? "",
        clientName: project?.clientName ?? "",
        description: project?.description ?? "",
        logoUrl: project?.logoUrl ?? "",
      });
      setFormError(null);
    }
  }, [open, project, reset]);

  async function onSubmit(values: FormValues): Promise<void> {
    setFormError(null);
    const input = {
      name: values.name,
      clientName: values.clientName,
      description: values.description ?? "",
      logoUrl: values.logoUrl ? values.logoUrl : null,
    };

    try {
      if (isEdit && project) {
        await updateProject.mutateAsync(input);
        toast.success("Project updated.");
      } else {
        const { project: created } = await createProject.mutateAsync(input);
        toast.success("Project created.");
        navigate(`/projects/${created.id}`);
      }
      onOpenChange(false);
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : "Something went wrong. Please try again.",
      );
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit project" : "New project"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update this project's basic information."
              : "You'll connect its CMS and collections after it's created."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Project name</Label>
            <Input id="name" {...register("name")} />
            <FormError message={errors.name?.message} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="clientName">Client name</Label>
            <Input id="clientName" {...register("clientName")} />
            <FormError message={errors.clientName?.message} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" rows={3} {...register("description")} />
            <FormError message={errors.description?.message} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="logoUrl">Logo URL (optional)</Label>
            <Input id="logoUrl" placeholder="https://…" {...register("logoUrl")} />
            <FormError message={errors.logoUrl?.message} />
          </div>

          <FormError message={formError ?? undefined} />

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="animate-spin" />}
              {isEdit ? "Save changes" : "Create project"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
