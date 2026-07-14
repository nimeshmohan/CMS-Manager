import { Controller, type Control } from "react-hook-form";
import type { FieldMapping } from "@cms-manager/shared";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { FormError } from "@/components/ui/form-error";
import { RichTextEditor } from "@/components/RichTextEditor";

interface DynamicFieldProps {
  field: FieldMapping;
  control: Control<Record<string, unknown>>;
  error?: string;
  /** Rendered below the input for the title field's live slug preview (Section 4.6). */
  helperText?: string;
}

/** Renders the input appropriate to a `FieldMapping`'s type — the create/edit form is generated at runtime from a collection's `fields`, never a fixed per-collection type (Section 4.5). */
export function DynamicField({ field, control, error, helperText }: DynamicFieldProps) {
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

      {/* Read-only: Webflow's Items API silently discards a bare URL for an image field instead of setting it, so this tool can't safely write one back yet — shown here, edited in Webflow (Section 6). */}
      {field.type === "image" && (
        <Controller
          control={control}
          name={field.key}
          render={({ field: rhfField }) => {
            const url = typeof rhfField.value === "string" ? rhfField.value : "";
            return (
              <div className="flex items-center gap-3 rounded-md border p-2">
                {url ? (
                  <img src={url} alt="" className="h-12 w-12 rounded object-cover" />
                ) : (
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded bg-muted text-[10px] text-muted-foreground">
                    No image
                  </div>
                )}
                <p className="truncate text-xs text-muted-foreground">
                  {url || "No image set."}
                </p>
              </div>
            );
          }}
        />
      )}

      {field.type === "image" && (
        <p className="text-xs text-muted-foreground">
          Managed in Webflow directly — image uploads aren't supported here yet.
        </p>
      )}

      {helperText && (
        <p className="text-xs text-muted-foreground">{helperText}</p>
      )}
      <FormError message={error} />
    </div>
  );
}
