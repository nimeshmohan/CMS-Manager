import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { useAddCollection, useAvailableCollections } from "@/api/collections";

interface AddCollectionsDialogProps {
  project: Project;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Section 4.4 step 6 — every collection on the site, check the ones this project should manage; only checked ones are ever persisted. */
export function AddCollectionsDialog({
  project,
  open,
  onOpenChange,
}: AddCollectionsDialogProps) {
  const { data: collections, isPending, isError } = useAvailableCollections(
    project.id,
    open,
  );
  const addCollection = useAddCollection(project.id);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);

  function toggle(id: string): void {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleAdd(): Promise<void> {
    if (!collections) return;
    setSubmitting(true);
    let addedCount = 0;
    try {
      for (const collection of collections) {
        if (!selected.has(collection.id)) continue;
        await addCollection.mutateAsync({
          providerCollectionId: collection.id,
          name: collection.name,
        });
        addedCount += 1;
      }
      toast.success(
        `Added ${addedCount} collection${addedCount === 1 ? "" : "s"}.`,
      );
      setSelected(new Set());
      onOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not add collections.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add collections</DialogTitle>
          <DialogDescription>
            Choose which collections on this site this project should manage.
          </DialogDescription>
        </DialogHeader>

        {isPending && (
          <div className="space-y-2">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
          </div>
        )}

        {isError && (
          <p className="text-sm text-destructive">
            Could not load collections from Webflow. Please try again.
          </p>
        )}

        {!isPending && !isError && collections?.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Every collection on this site is already managed.
          </p>
        )}

        {!isPending && !isError && collections && collections.length > 0 && (
          <div className="max-h-72 space-y-1 overflow-y-auto">
            {collections.map((collection) => (
              <label
                key={collection.id}
                className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-accent"
              >
                <Checkbox
                  checked={selected.has(collection.id)}
                  onCheckedChange={() => toggle(collection.id)}
                />
                <span className="text-sm">{collection.name}</span>
                {typeof collection.itemCount === "number" && (
                  <span className="text-xs text-muted-foreground">
                    {collection.itemCount} items
                  </span>
                )}
              </label>
            ))}
          </div>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => void handleAdd()}
            disabled={submitting || selected.size === 0}
          >
            {submitting && <Loader2 className="animate-spin" />}
            Add {selected.size > 0 ? selected.size : ""} collection
            {selected.size === 1 ? "" : "s"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
