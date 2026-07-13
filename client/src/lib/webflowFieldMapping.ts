import type { FieldType, ProviderField } from "@cms-manager/shared";

/** Best-effort mapping from Webflow's field type strings to this tool's four field types — always editable afterward (Section 4.5). */
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

/** A url-safe, snake_case key suggestion from a provider field's slug or display name — auto-suggested, always editable (Section 4.4 step 8). */
export function suggestFieldKey(providerField: Pick<ProviderField, "slug" | "displayName">): string {
  const source = providerField.slug || providerField.displayName;
  return source
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}
