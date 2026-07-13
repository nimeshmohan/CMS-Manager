import type { FieldMapping, FieldType } from "../types/project";
import type { ProviderField } from "../types/provider";

/** Best-effort mapping from Webflow's field type strings to this tool's four field types. */
const WEBFLOW_TYPE_SUGGESTIONS: Record<string, FieldType> = {
  PlainText: "text",
  Email: "text",
  Phone: "text",
  Link: "text",
  Color: "text",
  Video: "text",
  Option: "text",
  RichText: "richText",
  Number: "number",
  Switch: "boolean",
};

export function suggestFieldType(providerFieldType: string): FieldType {
  return WEBFLOW_TYPE_SUGGESTIONS[providerFieldType] ?? "text";
}

/** A url-safe, snake_case key from a provider field's slug or display name. */
export function suggestFieldKey(
  providerField: Pick<ProviderField, "slug" | "displayName">,
): string {
  const source = providerField.slug || providerField.displayName;
  return source
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

/** Webflow's built-in item fields — Name and Slug are their own dedicated inputs on every item form (Section 4.6), never offered as mappable/editable here. */
const BUILT_IN_SLUGS = new Set(["name", "slug"]);

/**
 * Every field on a provider's collection schema, mapped automatically by
 * name-similarity the moment a collection is added — there's no separate
 * manual "map fields" step.
 */
export function autoMapFields(providerFields: ProviderField[]): FieldMapping[] {
  const mappable = providerFields.filter((field) => !BUILT_IN_SLUGS.has(field.slug));

  return mappable.map((field) => ({
    key: suggestFieldKey(field),
    label: field.displayName,
    providerFieldSlug: field.slug,
    type: suggestFieldType(field.type),
    required: field.isRequired,
  }));
}
