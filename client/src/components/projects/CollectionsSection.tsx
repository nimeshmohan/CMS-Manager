import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { List, Plus, Trash2 } from "lucide-react";
import type { CollectionConfig, Project } from "@cms-manager/shared";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useRemoveCollection } from "@/api/collections";
import { AddCollectionsDialog } from "./AddCollectionsDialog";

export function CollectionsSection({ project }: { project: Project }) {
  const removeCollection = useRemoveCollection(project.id);
  const [addOpen, setAddOpen] = useState(false);
  const [removing, setRemoving] = useState<CollectionConfig | null>(null);

  async function handleRemove(): Promise<void> {
    if (!removing) return;
    try {
      await removeCollection.mutateAsync(removing.id);
      toast.success(`"${removing.name}" is no longer managed.`);
      setRemoving(null);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not remove collection.",
      );
    }
  }

  return (
    <Card className="max-w-2xl">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-base">Collections</CardTitle>
          <CardDescription>
            The Webflow collections this project manages.
          </CardDescription>
        </div>
        <Button size="sm" onClick={() => setAddOpen(true)}>
          <Plus />
          Add collections
        </Button>
      </CardHeader>
      <CardContent>
        {project.collections.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No collections configured yet.
          </p>
        ) : (
          <div className="space-y-1">
            {project.collections.map((collection) => (
              <div
                key={collection.id}
                className="flex items-center justify-between rounded-md border px-3 py-2"
              >
                <div>
                  <p className="text-sm font-medium">{collection.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {collection.fields.length}{" "}
                    {collection.fields.length === 1 ? "field" : "fields"}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                    <Link to={`/projects/${project.id}/collections/${collection.id}`}>
                      <List className="h-4 w-4" />
                      <span className="sr-only">View items</span>
                    </Link>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => setRemoving(collection)}
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="sr-only">Remove collection</span>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <AddCollectionsDialog project={project} open={addOpen} onOpenChange={setAddOpen} />

      <AlertDialog open={removing !== null} onOpenChange={(open) => !open && setRemoving(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Stop managing "{removing?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes it from this tool only — nothing is deleted in
              Webflow. You can add it back later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleRemove()}>
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
