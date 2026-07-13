import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useProjects } from "@/api/projects";
import { useGlobalActivityLogs } from "@/api/activityLogs";
import { ActivityLogPagination, ActivityLogTable } from "@/components/activity/ActivityLogTable";

const PAGE_SIZE = 20;
const ALL_PROJECTS = "__all__";

/** Global — Super Admin only (Section 15), guarded by `RequireSuperAdmin` at the route level. */
export function ActivityLogPage() {
  const { data: projects } = useProjects();
  const [projectFilter, setProjectFilter] = useState(ALL_PROJECTS);
  const [page, setPage] = useState(1);

  const { data, isPending, isError, isFetching } = useGlobalActivityLogs(
    {
      projectId: projectFilter === ALL_PROJECTS ? undefined : projectFilter,
      page,
      pageSize: PAGE_SIZE,
    },
    true,
  );

  return (
    <div className="flex-1 space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Activity Log</h1>
        <p className="text-sm text-muted-foreground">Every mutating action across the platform.</p>
      </div>

      <Select
        value={projectFilter}
        onValueChange={(value) => {
          setProjectFilter(value);
          setPage(1);
        }}
      >
        <SelectTrigger className="w-[240px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_PROJECTS}>All projects</SelectItem>
          {projects?.map((project) => (
            <SelectItem key={project.id} value={project.id}>
              {project.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <ActivityLogTable
        entries={data?.entries ?? []}
        isLoading={isPending}
        isError={isError}
        showProjectColumn
      />

      {data && (
        <ActivityLogPagination
          page={data.page}
          total={data.total}
          pageSize={data.pageSize}
          isFetching={isFetching}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}
