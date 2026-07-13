import { ArrowDown, ArrowUp, ArrowUpDown, MoreHorizontal, Pencil, Trash2, UploadCloud, Undo2 } from "lucide-react";
import type { FieldMapping, Item } from "@cms-manager/shared";
import { Badge } from "@/components/ui/badge";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatRelativeTime } from "@/lib/formatRelativeTime";
import type { ResolvedPermissions } from "@/hooks/usePermissions";

interface DynamicItemTableProps {
  fields: FieldMapping[];
  items: Item[];
  isLoading: boolean;
  isError: boolean;
  sortBy: string;
  sortOrder: "asc" | "desc";
  onSort: (key: string) => void;
  permissions: ResolvedPermissions;
  onEdit: (item: Item) => void;
  onPublish: (item: Item) => void;
  onUnpublish: (item: Item) => void;
  onDelete: (item: Item) => void;
}

/** richText fields are excluded from columns — their content is too long for a table cell; they're still fully editable in the form. */
function tableColumns(fields: FieldMapping[]): FieldMapping[] {
  return fields.filter((f) => f.type !== "richText");
}

function formatCellValue(field: FieldMapping, value: unknown): string {
  if (field.type === "boolean") return value ? "Yes" : "No";
  if (value === undefined || value === null || value === "") return "—";
  return String(value);
}

export function DynamicItemTable({
  fields,
  items,
  isLoading,
  isError,
  sortBy,
  sortOrder,
  onSort,
  permissions,
  onEdit,
  onPublish,
  onUnpublish,
  onDelete,
}: DynamicItemTableProps) {
  const columns = tableColumns(fields);
  const columnCount = columns.length + 3; // + Published + Updated + Actions

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((field) => (
              <TableHead key={field.key}>
                <SortableHeader
                  label={field.label}
                  sortKey={field.key}
                  activeSortBy={sortBy}
                  sortOrder={sortOrder}
                  onSort={onSort}
                />
              </TableHead>
            ))}
            <TableHead>
              <SortableHeader
                label="Published"
                sortKey="published"
                activeSortBy={sortBy}
                sortOrder={sortOrder}
                onSort={onSort}
              />
            </TableHead>
            <TableHead>
              <SortableHeader
                label="Updated"
                sortKey="lastUpdated"
                activeSortBy={sortBy}
                sortOrder={sortOrder}
                onSort={onSort}
              />
            </TableHead>
            <TableHead className="text-right">Actions</TableHead>
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
                Could not load items. Please try again.
              </TableCell>
            </TableRow>
          ) : items.length > 0 ? (
            items.map((item) => (
              <TableRow key={item.id}>
                {columns.map((field) => (
                  <TableCell key={field.key} className={field.isTitleField ? "font-medium" : undefined}>
                    {formatCellValue(field, item.fieldData[field.key])}
                  </TableCell>
                ))}
                <TableCell>
                  <Badge variant={item.published ? "success" : "secondary"}>
                    {item.published ? "Published" : "Draft"}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatRelativeTime(item.lastUpdated)}
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal />
                        <span className="sr-only">Open actions</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {permissions.canEdit && (
                        <DropdownMenuItem onClick={() => onEdit(item)}>
                          <Pencil />
                          Edit
                        </DropdownMenuItem>
                      )}
                      {permissions.canPublish && !item.published && (
                        <DropdownMenuItem onClick={() => onPublish(item)}>
                          <UploadCloud />
                          Publish
                        </DropdownMenuItem>
                      )}
                      {permissions.canPublish && item.published && (
                        <DropdownMenuItem onClick={() => onUnpublish(item)}>
                          <Undo2 />
                          Unpublish (move to draft)
                        </DropdownMenuItem>
                      )}
                      {permissions.canDelete && (
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => onDelete(item)}
                        >
                          <Trash2 />
                          Delete
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columnCount} className="py-10 text-center text-sm text-muted-foreground">
                No items found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

function SortableHeader({
  label,
  sortKey,
  activeSortBy,
  sortOrder,
  onSort,
}: {
  label: string;
  sortKey: string;
  activeSortBy: string;
  sortOrder: "asc" | "desc";
  onSort: (key: string) => void;
}) {
  const active = activeSortBy === sortKey;
  return (
    <button
      type="button"
      onClick={() => onSort(sortKey)}
      className="inline-flex items-center gap-1 hover:text-foreground"
    >
      {label}
      {active ? (
        sortOrder === "asc" ? (
          <ArrowUp className="h-3.5 w-3.5" />
        ) : (
          <ArrowDown className="h-3.5 w-3.5" />
        )
      ) : (
        <ArrowUpDown className="h-3.5 w-3.5 opacity-40" />
      )}
    </button>
  );
}
