import type { ActivityLogEntry } from "@cms-manager/shared";
import { ACTIVITY_ACTION_LABELS } from "@cms-manager/shared";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatRelativeTime } from "@/lib/formatRelativeTime";

/** Before/after JSON, side by side (Section 10) — the raw snapshots `logActivity` stored at the time of the change. */
export function ActivityLogDetailsDialog({
  entry,
  onOpenChange,
}: {
  entry: ActivityLogEntry | null;
  onOpenChange: (open: boolean) => void;
}) {
  if (!entry) return null;

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{ACTIVITY_ACTION_LABELS[entry.action]}</DialogTitle>
          <DialogDescription>
            {entry.userEmail} &middot; {formatRelativeTime(entry.timestamp)}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">Before</p>
            <pre className="max-h-80 overflow-auto rounded-md border bg-muted p-3 text-xs">
              {entry.previousData ? JSON.stringify(entry.previousData, null, 2) : "—"}
            </pre>
          </div>
          <div>
            <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">After</p>
            <pre className="max-h-80 overflow-auto rounded-md border bg-muted p-3 text-xs">
              {entry.newData ? JSON.stringify(entry.newData, null, 2) : "—"}
            </pre>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
