import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Star, Trash2 } from "lucide-react";
import type { CollectionConfig, FieldMapping, FieldType, Project } from "@cms-manager/shared";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCollectionSchema, useUpdateCollectionFields } from "@/api/collections";
import { suggestFieldKey, suggestFieldType } from "@/lib/webflowFieldMapping";

const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  text: "Text",
  number: "Number",
  richText: "Rich text",
  boolean: "Boolean",
};

/** Webflow's built-in item fields — the backend sets these automatically from the title field and the generated slug (Section 4.6), so they're never offered as mappable/editable here. */
const BUILT_IN_SLUGS = new Set(["name", "slug"]);

interface FieldMappingDialogProps {
  project: Project;
  collection: CollectionConfig;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Section 4.4 step 8 — every mappable Webflow field is auto-suggested the
 * moment the schema loads (name-similarity label/key/type, per Section
 * 4.4), not added one at a time. Everything here stays editable — remove a
 * field, change its label/type/required/title flag — before "Save field
 * mapping" actually persists it.
 */
export function FieldMappingDialog({
  project,
  collection,
  open,
  onOpenChange,
}: FieldMappingDialogProps) {
  const { data: schema, isPending, isError } = useCollectionSchema(
    project.id,
    collection.id,
    open,
  );
  const updateFields = useUpdateCollectionFields(project.id, collection.id);

  const [fields, setFields] = useState<FieldMapping[]>(collection.fields);

  useEffect(() => {
    if (!open || !schema) return;

    setFields((prev) => {
      const mappedSlugs = new Set(prev.map((f) => f.providerFieldSlug));
      const newlyMappable = schema.filter(
        (f) => !BUILT_IN_SLUGS.has(f.slug) && !mappedSlugs.has(f.slug),
      );
      if (newlyMappable.length === 0) return prev;

      const alreadyHasTitleField = prev.some((f) => f.isTitleField);
      const suggestions: FieldMapping[] = newlyMappable.map((field, index) => ({
        key: suggestFieldKey(field),
        label: field.displayName,
        providerFieldSlug: field.slug,
        type: suggestFieldType(field.type),
        required: field.isRequired,
        isTitleField:
          !alreadyHasTitleField && index === 0 && suggestFieldType(field.type) === "text",
      }));
      return [...prev, ...suggestions];
    });
    // Only re-run when the dialog (re)opens or the schema itself changes —
    // not on every `fields` edit, which would fight the user's own changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, schema]);

  useEffect(() => {
    if (open) setFields(collection.fields);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, collection.id]);

  function updateField(key: string, patch: Partial<FieldMapping>): void {
    setFields((prev) =>
      prev.map((f) => {
        if (f.key !== key) {
          // Enforce at most one title field (Section 4.5).
          return patch.isTitleField ? { ...f, isTitleField: false } : f;
        }
        return { ...f, ...patch };
      }),
    );
  }

  function handleRemoveField(key: string): void {
    setFields((prev) => prev.filter((f) => f.key !== key));
  }

  async function handleSave(): Promise<void> {
    try {
      await updateFields.mutateAsync(fields);
      toast.success("Field mapping saved.");
      onOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not save field mapping.",
      );
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Configure fields — {collection.name}</DialogTitle>
          <DialogDescription>
            Every Webflow field is mapped automatically — adjust label, type,
            required, or which field drives the slug, then save.
          </DialogDescription>
        </DialogHeader>

        {isPending && (
          <div className="space-y-2">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
          </div>
        )}
        {isError && (
          <p className="text-sm text-destructive">
            Could not load this collection's fields from Webflow.
          </p>
        )}

        {!isPending && !isError && (
          <div className="max-h-[60vh] space-y-3 overflow-y-auto">
            {fields.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No mappable fields found on this collection.
              </p>
            )}
            {fields.map((field) => (
              <div key={field.key} className="space-y-2 rounded-md border p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {field.providerFieldSlug}
                    </span>
                    {field.isTitleField && (
                      <Badge variant="default">
                        <Star className="h-3 w-3" />
                        Title
                      </Badge>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => handleRemoveField(field.key)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span className="sr-only">Remove field</span>
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Label</Label>
                    <Input
                      value={field.label}
                      onChange={(e) => updateField(field.key, { label: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Type</Label>
                    <Select
                      value={field.type}
                      onValueChange={(value) =>
                        updateField(field.key, { type: value as FieldType })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(Object.keys(FIELD_TYPE_LABELS) as FieldType[]).map((type) => (
                          <SelectItem key={type} value={type}>
                            {FIELD_TYPE_LABELS[type]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={field.required}
                      onCheckedChange={(checked) =>
                        updateField(field.key, { required: checked === true })
                      }
                    />
                    Required
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={field.isTitleField ?? false}
                      onCheckedChange={(checked) =>
                        updateField(field.key, { isTitleField: checked === true })
                      }
                    />
                    Title field (drives the slug)
                  </label>
                </div>
              </div>
            ))}
          </div>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => void handleSave()} disabled={updateFields.isPending}>
            {updateFields.isPending && <Loader2 className="animate-spin" />}
            Save field mapping
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
