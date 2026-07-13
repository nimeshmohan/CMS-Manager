import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useProjectActivityLogs } from "@/api/activityLogs";
import { ActivityLogPagination, ActivityLogTable } from "@/components/activity/ActivityLogTable";

const PAGE_SIZE = 10;

/** Project Manager / Super Admin only (Section 10) — gated by the caller rendering this. */
export function ActivityLogSection({ projectId }: { projectId: string }) {
  const [page, setPage] = useState(1);
  const { data, isPending, isError, isFetching } = useProjectActivityLogs(
    projectId,
    { page, pageSize: PAGE_SIZE },
    true,
  );

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle className="text-base">Activity</CardTitle>
        <CardDescription>Recent changes to this project.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <ActivityLogTable
          entries={data?.entries ?? []}
          isLoading={isPending}
          isError={isError}
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
      </CardContent>
    </Card>
  );
}
