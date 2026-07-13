import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Plus, Star, Trash2 } from "lucide-react";
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

interface FieldMappingDialogProps {
  project: Project;
  collection: CollectionConfig;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface DraftField {
  providerFieldSlug: string;
  label: string;
  key: string;
  type: FieldType;
  required: boolean;
  isTitleField: boolean;
}

const EMPTY_DRAFT: DraftField = {
  providerFieldSlug: "",
  label: "",
  key: "",
  type: "text",
  required: false,
  isTitleField: false,
};

/**
 * Section 4.4 step 8 — map each Webflow field to this tool's logical
 * fields. Selecting a provider field auto-suggests label/key/type by name
 * similarity (Section 4.4); everything stays editable before it's added.
 * Nothing is saved to the collection until "Save field mapping".
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
  const [draft, setDraft] = useState<DraftField>(EMPTY_DRAFT);

  useEffect(() => {
    if (open) {
      setFields(collection.fields);
      setDraft(EMPTY_DRAFT);
    }
  }, [open, collection.fields]);

  const usedProviderSlugs = new Set(fields.map((f) => f.providerFieldSlug));
  const availableProviderFields = (schema ?? []).filter(
    (f) => !usedProviderSlugs.has(f.slug),
  );

  function handlePickProviderField(slug: string): void {
    const providerField = (schema ?? []).find((f) => f.slug === slug);
    if (!providerField) return;
    setDraft({
      providerFieldSlug: providerField.slug,
      label: providerField.displayName,
      key: suggestFieldKey(providerField),
      type: suggestFieldType(providerField.type),
      required: providerField.isRequired,
      isTitleField: false,
    });
  }

  function handleAddField(): void {
    if (!draft.providerFieldSlug || !draft.key.trim() || !draft.label.trim()) return;

    const newField: FieldMapping = {
      key: draft.key.trim(),
      label: draft.label.trim(),
      providerFieldSlug: draft.providerFieldSlug,
      type: draft.type,
      required: draft.required,
      isTitleField: draft.isTitleField,
    };

    setFields((prev) => {
      // At most one title field per collection (Section 4.5).
      const cleared = draft.isTitleField
        ? prev.map((f) => ({ ...f, isTitleField: false }))
        : prev;
      return [...cleared, newField];
    });
    setDraft(EMPTY_DRAFT);
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
            Map Webflow fields to how they'll appear in this tool.
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
          <div className="space-y-4">
            {fields.length > 0 && (
              <div className="space-y-1">
                {fields.map((field) => (
                  <div
                    key={field.key}
                    className="flex items-center justify-between rounded-md border px-3 py-2"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{field.label}</span>
                      <span className="text-xs text-muted-foreground">
                        {field.providerFieldSlug}
                      </span>
                      <Badge variant="secondary">{FIELD_TYPE_LABELS[field.type]}</Badge>
                      {field.required && <Badge variant="outline">Required</Badge>}
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
                ))}
              </div>
            )}

            <div className="space-y-3 rounded-md border border-dashed p-3">
              <Label className="text-xs uppercase text-muted-foreground">
                Add a field
              </Label>

              <Select
                value={draft.providerFieldSlug}
                onValueChange={handlePickProviderField}
                disabled={availableProviderFields.length === 0}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      availableProviderFields.length === 0
                        ? "All fields mapped"
                        : "Choose a Webflow field"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {availableProviderFields.map((field) => (
                    <SelectItem key={field.slug} value={field.slug}>
                      {field.displayName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {draft.providerFieldSlug && (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label htmlFor="fieldLabel" className="text-xs">
                        Label
                      </Label>
                      <Input
                        id="fieldLabel"
                        value={draft.label}
                        onChange={(e) =>
                          setDraft((d) => ({ ...d, label: e.target.value }))
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="fieldKey" className="text-xs">
                        Key
                      </Label>
                      <Input
                        id="fieldKey"
                        value={draft.key}
                        onChange={(e) =>
                          setDraft((d) => ({ ...d, key: e.target.value }))
                        }
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Type</Label>
                    <Select
                      value={draft.type}
                      onValueChange={(value) =>
                        setDraft((d) => ({ ...d, type: value as FieldType }))
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

                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={draft.required}
                        onCheckedChange={(checked) =>
                          setDraft((d) => ({ ...d, required: checked === true }))
                        }
                      />
                      Required
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={draft.isTitleField}
                        onCheckedChange={(checked) =>
                          setDraft((d) => ({ ...d, isTitleField: checked === true }))
                        }
                      />
                      Title field (drives the slug)
                    </label>
                  </div>

                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={handleAddField}
                    disabled={!draft.key.trim() || !draft.label.trim()}
                  >
                    <Plus />
                    Add field
                  </Button>
                </>
              )}
            </div>
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
