import { useState } from "react";
import type { ActivityLogEntry } from "@cms-manager/shared";
import { ACTIVITY_ACTION_LABELS } from "@cms-manager/shared";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatRelativeTime } from "@/lib/formatRelativeTime";
import { ActivityLogDetailsDialog } from "./ActivityLogDetailsDialog";

interface ActivityLogTableProps {
  entries: ActivityLogEntry[];
  isLoading: boolean;
  isError: boolean;
  /** Shown as its own column only for the global view — redundant on a page already scoped to one project. */
  showProjectColumn?: boolean;
}

function targetDescription(entry: ActivityLogEntry): string {
  if (entry.itemId) return `Item ${entry.itemId}`;
  if (entry.targetUserId) return `User ${entry.targetUserId}`;
  if (entry.collectionId) return `Collection ${entry.collectionId}`;
  return "—";
}

export function ActivityLogTable({
  entries,
  isLoading,
  isError,
  showProjectColumn,
}: ActivityLogTableProps) {
  const [viewing, setViewing] = useState<ActivityLogEntry | null>(null);
  const columnCount = showProjectColumn ? 5 : 4;

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>User</TableHead>
            <TableHead>Action</TableHead>
            <TableHead>Target</TableHead>
            {showProjectColumn && <TableHead>Project</TableHead>}
            <TableHead className="text-right">When</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                {Array.from({ length: columnCount }).map((__, j) => (
                  <TableCell key={j}>
                    <Skeleton className="h-5 w-full" />
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : isError ? (
            <TableRow>
              <TableCell colSpan={columnCount} className="py-10 text-center text-sm text-muted-foreground">
                Could not load activity.
              </TableCell>
            </TableRow>
          ) : entries.length > 0 ? (
            entries.map((entry) => (
              <TableRow
                key={entry.id}
                className="cursor-pointer"
                onClick={() => setViewing(entry)}
              >
                <TableCell>{entry.userEmail}</TableCell>
                <TableCell>{ACTIVITY_ACTION_LABELS[entry.action]}</TableCell>
                <TableCell className="text-muted-foreground">{targetDescription(entry)}</TableCell>
                {showProjectColumn && (
                  <TableCell className="text-muted-foreground">
                    {entry.projectId ?? "Platform"}
                  </TableCell>
                )}
                <TableCell className="text-right text-muted-foreground">
                  {formatRelativeTime(entry.timestamp)}
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columnCount} className="py-10 text-center text-sm text-muted-foreground">
                No activity yet.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      <ActivityLogDetailsDialog entry={viewing} onOpenChange={(open) => !open && setViewing(null)} />
    </div>
  );
}

export function ActivityLogPagination({
  page,
  total,
  pageSize,
  isFetching,
  onPageChange,
}: {
  page: number;
  total: number;
  pageSize: number;
  isFetching: boolean;
  onPageChange: (page: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (total === 0) return null;

  return (
    <div className="flex items-center justify-between text-sm text-muted-foreground">
      <span>
        Page {page} of {totalPages} &middot; {total} entr{total === 1 ? "y" : "ies"}
      </span>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1 || isFetching}
          onClick={() => onPageChange(Math.max(1, page - 1))}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= totalPages || isFetching}
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
