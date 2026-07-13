import { useNavigate } from "react-router-dom";
import { MoreVertical, Pencil, Copy, Archive, ArchiveRestore, Trash2 } from "lucide-react";
import type { Project } from "@cms-manager/shared";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatRelativeTime } from "@/lib/formatRelativeTime";
import { usePermissions } from "@/hooks/usePermissions";

interface ProjectCardProps {
  project: Project;
  onEdit: (project: Project) => void;
  onDuplicate: (project: Project) => void;
  onToggleArchive: (project: Project) => void;
  onDelete: (project: Project) => void;
}

function ProjectLogo({ project }: { project: Project }) {
  if (project.logoUrl) {
    return (
      <img
        src={project.logoUrl}
        alt=""
        className="h-10 w-10 shrink-0 rounded-md object-cover"
      />
    );
  }
  const initials = project.name.slice(0, 2).toUpperCase();
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary text-sm font-semibold text-primary-foreground">
      {initials}
    </div>
  );
}

export function ProjectCard({
  project,
  onEdit,
  onDuplicate,
  onToggleArchive,
  onDelete,
}: ProjectCardProps) {
  const navigate = useNavigate();
  const { canManage } = usePermissions(project.id);

  return (
    <Card
      className="cursor-pointer transition-shadow hover:shadow-md"
      onClick={() => navigate(`/projects/${project.id}`)}
    >
      <CardContent className="flex flex-col gap-3 pt-6">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3">
            <ProjectLogo project={project} />
            <div className="min-w-0">
              <p className="truncate font-medium">{project.name}</p>
              <p className="truncate text-sm text-muted-foreground">
                {project.clientName}
              </p>
            </div>
          </div>

          {canManage && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreVertical className="h-4 w-4" />
                  <span className="sr-only">Project actions</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                onClick={(e) => e.stopPropagation()}
              >
                <DropdownMenuItem onClick={() => onEdit(project)}>
                  <Pencil />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onDuplicate(project)}>
                  <Copy />
                  Duplicate
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onToggleArchive(project)}>
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
                  onClick={() => onDelete(project)}
                >
                  <Trash2 />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {project.description && (
          <p className="line-clamp-2 text-sm text-muted-foreground">
            {project.description}
          </p>
        )}

        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-2">
            <Badge variant={project.status === "active" ? "success" : "secondary"}>
              {project.status === "active" ? "Active" : "Archived"}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {project.collections.length}{" "}
              {project.collections.length === 1 ? "collection" : "collections"}
            </span>
          </div>
          <span className="text-xs text-muted-foreground">
            Updated {formatRelativeTime(project.updatedAt)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
