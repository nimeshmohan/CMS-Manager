import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, MoreVertical, Pencil, Copy, Archive, ArchiveRestore, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useArchiveProject, useProject } from "@/api/projects";
import { useProjectSites } from "@/api/connections";
import { usePermissions } from "@/hooks/usePermissions";
import { ProjectFormDialog } from "@/components/projects/ProjectFormDialog";
import { DuplicateProjectDialog } from "@/components/projects/DuplicateProjectDialog";
import { DeleteProjectDialog } from "@/components/projects/DeleteProjectDialog";
import { ConnectWebflowSection } from "@/components/projects/ConnectWebflowSection";
import { SiteSelector } from "@/components/projects/SiteSelector";
import { CollectionsSection } from "@/components/projects/CollectionsSection";
import { MembersSection } from "@/components/members/MembersSection";
import { ProjectStatsCards } from "@/components/projects/ProjectStatsCards";
import { ActivityLogSection } from "@/components/projects/ActivityLogSection";
import { useProjectDashboardSummary } from "@/api/dashboard";

const CONNECT_ERROR_MESSAGES: Record<string, string> = {
  missing_params: "Webflow did not return the expected authorization details. Please try again.",
  invalid_state: "This authorization request has expired or was already used. Please try again.",
};

export function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: project, isPending, isError } = useProject(id);
  const { canManage } = usePermissions(id);
  const archiveProject = useArchiveProject();

  const [editOpen, setEditOpen] = useState(false);
  const [duplicateOpen, setDuplicateOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  useEffect(() => {
    if (searchParams.get("connected") === "1") {
      toast.success("Connected to Webflow.");
      setSearchParams((prev) => {
        prev.delete("connected");
        return prev;
      }, { replace: true });
    }
    const connectError = searchParams.get("connectError");
    if (connectError) {
      toast.error(CONNECT_ERROR_MESSAGES[connectError] ?? "Could not connect to Webflow.");
      setSearchParams((prev) => {
        prev.delete("connectError");
        return prev;
      }, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const needsSiteSelection = Boolean(
    project?.connectionMethod && !project.siteId,
  );
  const { data: sites } = useProjectSites(id ?? "", needsSiteSelection);
  const { data: dashboardSummary, isPending: isDashboardSummaryPending } =
    useProjectDashboardSummary(id ?? "", Boolean(project));

  if (isPending) {
    return (
      <div className="flex-1 space-y-4 p-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full max-w-2xl" />
      </div>
    );
  }

  if (isError || !project) {
    return (
      <div className="flex-1 p-6">
        <p className="text-sm text-muted-foreground">
          This project doesn't exist, or you don't have access to it.
        </p>
        <Link to="/projects" className="mt-2 inline-flex items-center gap-1 text-sm text-primary hover:underline">
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Projects
        </Link>
      </div>
    );
  }

  async function handleToggleArchive(): Promise<void> {
    if (!project) return;
    const archived = project.status !== "archived";
    try {
      await archiveProject.mutateAsync({ id: project.id, archived });
      toast.success(archived ? "Project archived." : "Project unarchived.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not update project.",
      );
    }
  }

  return (
    <div className="flex-1 space-y-6 p-6">
      <Link to="/projects" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to Projects
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          {project.logoUrl ? (
            <img src={project.logoUrl} alt="" className="h-14 w-14 rounded-lg object-cover" />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-primary text-lg font-semibold text-primary-foreground">
              {project.name.slice(0, 2).toUpperCase()}
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight">{project.name}</h1>
              <Badge variant={project.status === "active" ? "success" : "secondary"}>
                {project.status === "active" ? "Active" : "Archived"}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">{project.clientName}</p>
          </div>
        </div>

        {canManage && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <MoreVertical className="h-4 w-4" />
                <span className="sr-only">Project actions</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setEditOpen(true)}>
                <Pencil />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setDuplicateOpen(true)}>
                <Copy />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => void handleToggleArchive()}>
                {project.status === "archived" ? (
                  <>
                    <ArchiveRestore />
                    Unarchive
                  </>
                ) : (
                  <>
                    <Archive />
                    Archive
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2 />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {project.description && (
        <p className="max-w-2xl text-sm text-muted-foreground">{project.description}</p>
      )}

      <ProjectStatsCards summary={dashboardSummary} isLoading={isDashboardSummaryPending} />

      {!project.connectionMethod && canManage && (
        <ConnectWebflowSection projectId={project.id} />
      )}
      {!project.connectionMethod && !canManage && (
        <Card className="max-w-2xl">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">
              This project isn't connected to a CMS yet.
            </p>
          </CardContent>
        </Card>
      )}

      {needsSiteSelection && sites && sites.length > 0 && (
        <SiteSelector projectId={project.id} sites={sites} />
      )}

      {project.connectionMethod && project.siteId && (
        <p className="text-sm text-muted-foreground">
          {/* Masked per Section 9 — never the token itself, not even encrypted. */}
          Connected via {project.connectionMethod === "oauth" ? "OAuth" : "API Token"}.
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {canManage && <MembersSection project={project} />}
        {project.connectionMethod && project.siteId && (
          <CollectionsSection project={project} />
        )}
      </div>

      {canManage && <ActivityLogSection projectId={project.id} />}

      {editOpen && (
        <ProjectFormDialog open={editOpen} onOpenChange={setEditOpen} project={project} />
      )}
      {duplicateOpen && (
        <DuplicateProjectDialog project={project} onOpenChange={(open) => !open && setDuplicateOpen(false)} />
      )}
      {deleteOpen && (
        <DeleteProjectDialog
          project={project}
          onOpenChange={(open) => !open && setDeleteOpen(false)}
          redirectOnDelete
        />
      )}
    </div>
  );
}
