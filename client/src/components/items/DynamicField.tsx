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

      {helperText && (
        <p className="text-xs text-muted-foreground">{helperText}</p>
      )}
      <FormError message={error} />
    </div>
  );
}
