import { COLLECTION_PERMISSION_KEYS, type CollectionConfig, type CollectionPermission, type CollectionPermissionKey } from "@cms-manager/shared";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const PERMISSION_LABELS: Record<CollectionPermissionKey, string> = {
  canView: "View",
  canCreate: "Create",
  canEdit: "Edit",
  canDelete: "Delete",
  canPublish: "Publish",
};

interface MemberPermissionMatrixProps {
  collections: CollectionConfig[];
  /** Keyed by collectionId — a collection's presence here means it's selected/granted. */
  grants: Record<string, CollectionPermission>;
  onToggleCollection: (collection: CollectionConfig) => void;
  onTogglePermission: (collectionId: string, key: CollectionPermissionKey) => void;
}

/**
 * The per-collection checkbox grid used both when inviting someone and
 * when editing an existing member's access (Section 16) — a collection's
 * row checkbox controls whether they have any access to it at all; the
 * five action checkboxes are only meaningful once it's checked.
 */
export function MemberPermissionMatrix({
  collections,
  grants,
  onToggleCollection,
  onTogglePermission,
}: MemberPermissionMatrixProps) {
  if (collections.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        This project has no collections configured yet.
      </p>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Collection</TableHead>
            {COLLECTION_PERMISSION_KEYS.map((key) => (
              <TableHead key={key} className="text-center">
                {PERMISSION_LABELS[key]}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {collections.map((collection) => {
            const grant = grants[collection.id];
            const selected = Boolean(grant);
            return (
              <TableRow key={collection.id}>
                <TableCell>
                  <label className="flex items-center gap-2 text-sm font-medium">
                    <Checkbox
                      checked={selected}
                      onCheckedChange={() => onToggleCollection(collection)}
                    />
                    {collection.name}
                  </label>
                </TableCell>
                {COLLECTION_PERMISSION_KEYS.map((key) => (
                  <TableCell key={key} className="text-center">
                    <Checkbox
                      checked={grant?.[key] ?? false}
                      disabled={!selected}
                      onCheckedChange={() => onTogglePermission(collection.id, key)}
                    />
                  </TableCell>
                ))}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
