import { z } from "zod";

/** Only Webflow is implemented today; the union leaves room for Section 6's future adapters. */
export type CmsProvider = "webflow";

export type ConnectionMethod = "oauth" | "apiToken";

export type ProjectStatus = "active" | "archived";

export const fieldTypeSchema = z.enum(["text", "number", "richText", "boolean"]);
export type FieldType = z.infer<typeof fieldTypeSchema>;

/**
 * Maps one of this tool's logical item fields to a field on the provider's
 * actual collection schema (Section 4.5). The item table, create/edit form,
 * and validation schema for a collection are all generated at runtime from
 * its `fields: FieldMapping[]` — never from a fixed per-collection type.
 */
export interface FieldMapping {
  key: string;
  label: string;
  providerFieldSlug: string;
  type: FieldType;
  required: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
}

/** Validates a collection's field mapping when it's saved (Section 4.5) — the same schema client and server both import, so they can never drift. */
export const fieldMappingSchema = z.object({
  key: z.string().trim().min(1, "Field key is required"),
  label: z.string().trim().min(1, "Field label is required"),
  providerFieldSlug: z.string().trim().min(1, "Select a provider field"),
  type: fieldTypeSchema,
  required: z.boolean(),
  minLength: z.number().int().nonnegative().optional(),
  maxLength: z.number().int().nonnegative().optional(),
  min: z.number().optional(),
  max: z.number().optional(),
});

export interface CollectionConfig {
  id: string;
  projectId: string;
  /** Display name in this tool's UI, e.g. "Job Postings". */
  name: string;
  providerCollectionId: string;
  /** Last known item count, refreshed opportunistically. */
  itemCount?: number;
  fields: FieldMapping[];
  createdAt: string;
  updatedAt: string;
}

/**
 * A project's CMS connection credential. Never sent to the client in
 * plaintext (Section 9) — this shape describes what's stored, encrypted,
 * server-side.
 */
export interface ApiCredentials {
  method: ConnectionMethod;
  accessToken: string;
  refreshToken?: string;
}

export interface Project {
  id: string;
  name: string;
  clientName: string;
  description: string;
  logoUrl: string | null;
  cmsProvider: CmsProvider;
  siteId: string | null;
  connectionMethod: ConnectionMethod | null;
  /** Encrypted at rest (AES-256-GCM); decrypted only in memory, server-side. */
  apiCredentials: ApiCredentials | null;
  collections: CollectionConfig[];
  settings: Record<string, unknown>;
  status: ProjectStatus;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

/**
 * Basic-information fields only (Section 4.4 step 1). The CMS connection,
 * site/collection selection, and field mapping steps are a separate,
 * multi-step flow (Section 4.3–4.5) that operates on an already-created
 * project — added in the phase that implements the Webflow provider.
 */
export const createProjectSchema = z.object({
  name: z.string().trim().min(1, "Project name is required").max(120),
  clientName: z.string().trim().min(1, "Client name is required").max(120),
  description: z.string().trim().max(2000).default(""),
  logoUrl: z
    .string()
    .trim()
    .url("Enter a valid URL")
    .max(2000)
    .nullable()
    .optional(),
});
export type CreateProjectInput = z.infer<typeof createProjectSchema>;

export const updateProjectSchema = createProjectSchema.partial();
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
