import { useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";
import type { Project, ProjectStatus } from "@cms-manager/shared";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useArchiveProject, useProjects } from "@/api/projects";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { ProjectCard } from "@/components/projects/ProjectCard";
import { ProjectFormDialog } from "@/components/projects/ProjectFormDialog";
import { DeleteProjectDialog } from "@/components/projects/DeleteProjectDialog";
import { DuplicateProjectDialog } from "@/components/projects/DuplicateProjectDialog";
import { toast } from "sonner";

type StatusFilter = ProjectStatus | "all";
type SortKey = "name" | "updatedAt" | "createdAt";

export function ProjectsDashboardPage() {
  const { data: projects, isPending, isError } = useProjects();
  const archiveProject = useArchiveProject();

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 250);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("active");
  const [sortKey, setSortKey] = useState<SortKey>("updatedAt");

  const [createOpen, setCreateOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [duplicatingProject, setDuplicatingProject] = useState<Project | null>(null);
  const [deletingProject, setDeletingProject] = useState<Project | null>(null);

  const visibleProjects = useMemo(() => {
    if (!projects) return [];
    const query = debouncedSearch.trim().toLowerCase();

    return projects
      .filter((p) => statusFilter === "all" || p.status === statusFilter)
      .filter(
        (p) =>
          !query ||
          p.name.toLowerCase().includes(query) ||
          p.clientName.toLowerCase().includes(query),
      )
      .sort((a, b) => {
        if (sortKey === "name") return a.name.localeCompare(b.name);
        return b[sortKey].localeCompare(a[sortKey]);
      });
  }, [projects, debouncedSearch, statusFilter, sortKey]);

  async function handleToggleArchive(project: Project): Promise<void> {
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
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
          <p className="text-sm text-muted-foreground">
            Every project you have access to.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus />
          New Project
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by project or client name…"
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as StatusFilter)}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
            <SelectItem value="all">All statuses</SelectItem>
          </SelectContent>
        </Select>

        <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
          <SelectTrigger className="w-[170px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="updatedAt">Last updated</SelectItem>
            <SelectItem value="createdAt">Created date</SelectItem>
            <SelectItem value="name">Name</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isPending && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-[150px] rounded-xl" />
          ))}
        </div>
      )}

      {isError && (
        <p className="text-sm text-destructive">
          Could not load projects. Please try again.
        </p>
      )}

      {!isPending && !isError && visibleProjects.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-16 text-center">
          <p className="font-medium">No projects found</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            {projects && projects.length > 0
              ? "Try a different search or filter."
              : "Create your first project to get started."}
          </p>
          {(!projects || projects.length === 0) && (
            <Button onClick={() => setCreateOpen(true)}>
              <Plus />
              New Project
            </Button>
          )}
        </div>
      )}

      {!isPending && !isError && visibleProjects.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visibleProjects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onEdit={setEditingProject}
              onDuplicate={setDuplicatingProject}
              onToggleArchive={(p) => void handleToggleArchive(p)}
              onDelete={setDeletingProject}
            />
          ))}
        </div>
      )}

      <ProjectFormDialog open={createOpen} onOpenChange={setCreateOpen} />
      <ProjectFormDialog
        open={editingProject !== null}
        onOpenChange={(open) => !open && setEditingProject(null)}
        project={editingProject ?? undefined}
      />
      <DuplicateProjectDialog
        project={duplicatingProject}
        onOpenChange={(open) => !open && setDuplicatingProject(null)}
      />
      <DeleteProjectDialog
        project={deletingProject}
        onOpenChange={(open) => !open && setDeletingProject(null)}
      />
    </div>
  );
}
