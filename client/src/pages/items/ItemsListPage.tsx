import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, Plus, Search } from "lucide-react";
import type { Item } from "@cms-manager/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { useProject } from "@/api/projects";
import { useDeleteItem, useItems, usePublishItem, useUnpublishItem } from "@/api/items";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { usePermissions } from "@/hooks/usePermissions";
import { DynamicItemTable } from "@/components/items/DynamicItemTable";

const PAGE_SIZE = 10;

export function ItemsListPage() {
  const { id: projectId, collectionId } = useParams<{ id: string; collectionId: string }>();
  const navigate = useNavigate();
  const { data: project } = useProject(projectId);
  const permissions = usePermissions(projectId, collectionId);

  const collection = useMemo(
    () => project?.collections.find((c) => c.id === collectionId),
    [project, collectionId],
  );

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [sortBy, setSortBy] = useState("lastUpdated");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [deletingItem, setDeletingItem] = useState<Item | null>(null);

  const canLoad = Boolean(projectId && collectionId && permissions.canView);

  const { data, isPending, isError, isFetching } = useItems(
    projectId ?? "",
    collectionId ?? "",
    { search: debouncedSearch, sortBy, sortOrder, page, pageSize: PAGE_SIZE },
    canLoad,
  );

  const deleteItem = useDeleteItem(projectId ?? "", collectionId ?? "");
  const publishItem = usePublishItem(projectId ?? "", collectionId ?? "");
  const unpublishItem = useUnpublishItem(projectId ?? "", collectionId ?? "");

  function handleSort(key: string): void {
    if (key === sortBy) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(key);
      setSortOrder("asc");
    }
    setPage(1);
  }

  async function handlePublish(item: Item): Promise<void> {
    try {
      await publishItem.mutateAsync(item.id);
      toast.success("Item published.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not publish item.");
    }
  }

  async function handleUnpublish(item: Item): Promise<void> {
    try {
      await unpublishItem.mutateAsync(item.id);
      toast.success("Item moved back to draft.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not unpublish item.");
    }
  }

  async function handleDelete(): Promise<void> {
    if (!deletingItem) return;
    try {
      await deleteItem.mutateAsync(deletingItem.id);
      toast.success("Item deleted.");
      setDeletingItem(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete item.");
    }
  }

  if (!project || !collection) {
    return (
      <div className="flex-1 p-6">
        <p className="text-sm text-muted-foreground">
          This collection doesn't exist, or you don't have access to it.
        </p>
        <Link
          to={`/projects/${projectId}`}
          className="mt-2 inline-flex items-center gap-1 text-sm text-primary hover:underline"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to project
        </Link>
      </div>
    );
  }

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  return (
    <div className="flex-1 space-y-6 p-6">
      <Link
        to={`/projects/${projectId}`}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to project
      </Link>

      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{collection.name}</h1>
          <p className="text-sm text-muted-foreground">
            {project.name} — {collection.fields.length} field
            {collection.fields.length === 1 ? "" : "s"}
          </p>
        </div>
        {permissions.canCreate && (
          <Button
            onClick={() => navigate(`/projects/${projectId}/collections/${collectionId}/items/new`)}
          >
            <Plus />
            New Item
          </Button>
        )}
      </div>

      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="Search..."
          className="pl-9"
        />
      </div>

      <DynamicItemTable
        fields={collection.fields}
        items={data?.items ?? []}
        isLoading={isPending}
        isError={isError}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSort={handleSort}
        permissions={permissions}
        onEdit={(item) =>
          navigate(`/projects/${projectId}/collections/${collectionId}/items/${item.id}/edit`)
        }
        onPublish={(item) => void handlePublish(item)}
        onUnpublish={(item) => void handleUnpublish(item)}
        onDelete={setDeletingItem}
      />

      {data && data.total > 0 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Page {data.page} of {totalPages} &middot; {data.total} item
            {data.total === 1 ? "" : "s"}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1 || isFetching}
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages || isFetching}
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      <AlertDialog open={deletingItem !== null} onOpenChange={(open) => !open && setDeletingItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this item?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes it from {project.cmsProvider === "webflow" ? "Webflow" : "the CMS"}. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteItem.isPending}
              onClick={() => void handleDelete()}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
