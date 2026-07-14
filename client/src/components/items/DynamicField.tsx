import { useRef } from "react";
import { Controller, type Control } from "react-hook-form";
import { toast } from "sonner";
import { Loader2, Upload, X } from "lucide-react";
import type { FieldMapping } from "@cms-manager/shared";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { FormError } from "@/components/ui/form-error";
import { RichTextEditor } from "@/components/RichTextEditor";
import { useUploadImage } from "@/api/items";

interface DynamicFieldProps {
  field: FieldMapping;
  control: Control<Record<string, unknown>>;
  error?: string;
  /** Rendered below the input for the title field's live slug preview (Section 4.6). */
  helperText?: string;
  /** Only needed for `image` fields — routes the upload to this collection's assets endpoint (Section 6). */
  projectId?: string;
  collectionId?: string;
}

/**
 * The image itself uploads immediately on file select, independent of
 * "Save Draft"/"Publish" — the field's value only ever holds the
 * Webflow-hosted URL that upload returns (or the existing one), never a
 * local file, so the rest of the form never needs to know the
 * difference (Section 6).
 */
function ImageField({
  field,
  control,
  projectId,
  collectionId,
}: {
  field: FieldMapping;
  control: Control<Record<string, unknown>>;
  projectId?: string;
  collectionId?: string;
}) {
  const uploadImage = useUploadImage(projectId ?? "", collectionId ?? "");
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <Controller
      control={control}
      name={field.key}
      render={({ field: rhfField }) => {
        const url = typeof rhfField.value === "string" ? rhfField.value : "";

        async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>): Promise<void> {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file) return;
          try {
            const result = await uploadImage.mutateAsync(file);
            rhfField.onChange(result.url);
          } catch (error) {
            toast.error(error instanceof Error ? error.message : "Could not upload image.");
          }
        }

        return (
          <div className="space-y-2">
            <div className="flex items-center gap-3 rounded-md border p-2">
              {url ? (
                <img src={url} alt="" className="h-12 w-12 rounded object-cover" />
              ) : (
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded bg-muted text-[10px] text-muted-foreground">
                  No image
                </div>
              )}
              <p className="flex-1 truncate text-xs text-muted-foreground">
                {url || "No image set."}
              </p>
              {url && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0"
                  onClick={() => rhfField.onChange("")}
                >
                  <X className="h-3.5 w-3.5" />
                  <span className="sr-only">Remove image</span>
                </Button>
              )}
            </div>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => void handleFileChange(e)}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={uploadImage.isPending}
              onClick={() => inputRef.current?.click()}
            >
              {uploadImage.isPending ? <Loader2 className="animate-spin" /> : <Upload />}
              {uploadImage.isPending ? "Uploading..." : url ? "Replace image" : "Upload image"}
            </Button>
          </div>
        );
      }}
    />
  );
}

/** Renders the input appropriate to a `FieldMapping`'s type — the create/edit form is generated at runtime from a collection's `fields`, never a fixed per-collection type (Section 4.5). */
export function DynamicField({
  field,
  control,
  error,
  helperText,
  projectId,
  collectionId,
}: DynamicFieldProps) {
  if (field.type === "boolean") {
    return (
      <div className="space-y-2">
        <Controller
          control={control}
          name={field.key}
          render={({ field: rhfField }) => (
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={Boolean(rhfField.value)}
                onCheckedChange={(checked) => rhfField.onChange(checked === true)}
              />
              {field.label}
              {field.required && " *"}
            </label>
          )}
        />
        <FormError message={error} />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label htmlFor={field.key}>
        {field.label}
        {field.required && " *"}
      </Label>

      {field.type === "richText" && (
        <Controller
          control={control}
          name={field.key}
          render={({ field: rhfField }) => (
            <RichTextEditor
              value={typeof rhfField.value === "string" ? rhfField.value : ""}
              onChange={rhfField.onChange}
            />
          )}
        />
      )}

      {field.type === "text" && (
        <Controller
          control={control}
          name={field.key}
          render={({ field: rhfField }) => (
            <Input
              id={field.key}
              value={typeof rhfField.value === "string" ? rhfField.value : ""}
              onChange={rhfField.onChange}
              maxLength={field.maxLength}
            />
          )}
        />
      )}

      {field.type === "number" && (
        <Controller
          control={control}
          name={field.key}
          render={({ field: rhfField }) => (
            <Input
              id={field.key}
              type="number"
              min={field.min}
              max={field.max}
              step={1}
              value={
                typeof rhfField.value === "number" ? rhfField.value : ""
              }
              onChange={(e) =>
                rhfField.onChange(e.target.value === "" ? undefined : Number(e.target.value))
              }
            />
          )}
        />
      )}

      {field.type === "date" && (
        <Controller
          control={control}
          name={field.key}
          render={({ field: rhfField }) => {
            const iso = typeof rhfField.value === "string" ? rhfField.value : "";
            return (
              <Input
                id={field.key}
                type="date"
                value={iso ? iso.slice(0, 10) : ""}
                onChange={(e) => {
                  const value = e.target.value;
                  rhfField.onChange(value ? new Date(`${value}T00:00:00.000Z`).toISOString() : "");
                }}
              />
            );
          }}
        />
      )}

      {field.type === "image" && (
        <ImageField
          field={field}
          control={control}
          projectId={projectId}
          collectionId={collectionId}
        />
      )}

      {helperText && (
        <p className="text-xs text-muted-foreground">{helperText}</p>
      )}
      <FormError message={error} />
    </div>
  );
}
