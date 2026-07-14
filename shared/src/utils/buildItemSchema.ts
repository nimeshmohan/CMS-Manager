import { z } from "zod";
import type { FieldMapping } from "../types/project";
import { PUBLISH_TARGETS } from "../types/item";
import { stripHtml } from "../utils";

function buildFieldSchema(field: FieldMapping): z.ZodTypeAny {
  switch (field.type) {
    case "text": {
      let schema = z.string().trim();
      const effectiveMin = field.minLength ?? (field.required ? 1 : undefined);
      if (effectiveMin !== undefined) {
        schema = schema.min(
          effectiveMin,
          effectiveMin === 1 && field.minLength === undefined
            ? `${field.label} is required`
            : `${field.label} must be at least ${effectiveMin} characters`,
        );
      }
      if (field.maxLength !== undefined) {
        schema = schema.max(
          field.maxLength,
          `${field.label} must be ${field.maxLength} characters or fewer`,
        );
      }
      return field.required ? schema : schema.optional().default("");
    }

    case "richText": {
      // A rich text editor can produce "<p><br></p>" — visually empty but
      // not an empty string — so "non-empty" is checked after stripping
      // tags, never on the raw HTML length (Section 4.6).
      const base = z.string();
      if (!field.required) {
        return base.optional().default("");
      }
      return base.refine(
        (value) => stripHtml(value).length > 0,
        `${field.label} cannot be empty`,
      );
    }

    case "number": {
      let schema = z
        .number({ invalid_type_error: `${field.label} must be a number` })
        .int(`${field.label} must be a whole number`);
      if (field.min !== undefined) {
        schema = schema.min(field.min, `${field.label} must be at least ${field.min}`);
      }
      if (field.max !== undefined) {
        schema = schema.max(field.max, `${field.label} cannot exceed ${field.max}`);
      }
      return field.required ? schema : schema.optional();
    }

    case "boolean":
      return z.boolean().default(false);

    // The image's URL — Webflow accepts a plain URL string on write and
    // hosts it itself; reading it back is normalized from Webflow's
    // `{ url, alt }` object shape by `mapProviderItemToItem` (Section 6).
    case "image": {
      const schema = z.string().trim();
      return field.required
        ? schema.min(1, `${field.label} is required`)
        : schema.optional().default("");
    }

    // An ISO date string (`YYYY-MM-DD`, matching an `<input type="date">`).
    case "date": {
      const schema = z.string().trim();
      return field.required
        ? schema.min(1, `${field.label} is required`)
        : schema.optional().default("");
    }
  }
}

/**
 * Builds a Zod schema for a collection's `fieldData` from its
 * `FieldMapping[]` — never from a fixed per-collection TypeScript type
 * (Section 4.5). Imported by both the React form (via `zodResolver`) and
 * the Express route handler, so client and server validation can never
 * drift out of sync — exactly the guarantee the original hardcoded Job
 * schema gave (Section 4.6), now generalized to any collection.
 */
export function buildItemSchema(fields: FieldMapping[]) {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const field of fields) {
    shape[field.key] = buildFieldSchema(field);
  }
  return z.object(shape);
}

/**
 * `buildItemSchema` plus the built-in `name`/`slug` fields every Webflow
 * item has (Section 4.6) and the `publishTarget` every item create/edit
 * form and API payload carries alongside its field values — "draft",
 * "staging" (live item, site deployed to the `*.webflow.io` domain only),
 * or "live" (site deployed everywhere). `slug` is optional — left blank,
 * the server slugifies `name` instead.
 */
export function buildItemFormSchema(fields: FieldMapping[]) {
  return buildItemSchema(fields).extend({
    name: z.string().trim().min(1, "Name is required"),
    slug: z.string().trim().max(256).optional(),
    publishTarget: z.enum(PUBLISH_TARGETS),
  });
}
