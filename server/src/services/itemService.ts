import {
  slugify,
  type CollectionConfig,
  type FieldMapping,
  type Item,
  type Project,
} from "@cms-manager/shared";
import { AppError } from "../utils/AppError";
import { sanitizeRichText } from "../utils/sanitizeRichText";
import { resolveProvider, type CmsProvider, type ProviderCredentials, type ProviderItem } from "../providers";
import { projectService } from "./projectService";

// Webflow's list endpoint only supports exact-match filters, not free-text
// search, so search/sort/pagination are applied in memory here after
// fetching the collection's items, capped at a sane maximum (Section 6).
const MAX_ITEMS = 500;

export type SortOrder = "asc" | "desc";

export interface ListItemsParams {
  search?: string;
  /** A `FieldMapping.key`, or the system columns `name` | `lastUpdated` | `createdOn` | `published`. */
  sortBy?: string;
  sortOrder?: SortOrder;
  page?: number;
  pageSize?: number;
}

export interface ListItemsResult {
  items: Item[];
  total: number;
  page: number;
  pageSize: number;
}

function mapProviderItemToItem(
  providerItem: ProviderItem,
  collection: CollectionConfig,
): Item {
  const fieldData: Record<string, unknown> = {};
  for (const field of collection.fields) {
    const raw = providerItem.fieldData[field.providerFieldSlug];
    // `null`, never `undefined` — Firestore's Admin SDK rejects `undefined`
    // values outright, and this `Item` gets written verbatim into an
    // activity log entry (Section 10) right after it's built.
    fieldData[field.key] =
      raw ?? (field.type === "boolean" ? false : field.type === "number" ? null : "");
  }
  return {
    id: providerItem.id,
    collectionId: collection.id,
    name: providerItem.name,
    slug: providerItem.slug || null,
    fieldData,
    published: !providerItem.isDraft,
    createdOn: providerItem.createdOn,
    lastUpdated: providerItem.lastUpdated,
  };
}

/**
 * Rich text is sanitized here — the single point every field value passes
 * through before reaching a CMS provider, regardless of collection or
 * project (Section 4.5/9). `name` and `slug` are Webflow's built-in item
 * fields, always set explicitly here rather than derived from any mapped
 * field (Section 4.6).
 */
function mapInputToProviderFieldData(
  input: Record<string, unknown>,
  fields: FieldMapping[],
  slug: string,
  name: string,
): Record<string, unknown> {
  const fieldData: Record<string, unknown> = { slug, name };
  for (const field of fields) {
    let value = input[field.key];
    if (field.type === "richText" && typeof value === "string") {
      value = sanitizeRichText(value);
    }
    fieldData[field.providerFieldSlug] = value;
  }
  return fieldData;
}

function getSortValue(item: Item, sortBy: string): string | number | boolean {
  if (sortBy === "lastUpdated" || sortBy === "createdOn") return item[sortBy];
  if (sortBy === "published") return item.published;
  if (sortBy === "name") return item.name;
  const value = item.fieldData[sortBy];
  if (typeof value === "number" || typeof value === "boolean") return value;
  return typeof value === "string" ? value : "";
}

async function generateUniqueSlug(
  title: string,
  credentials: ProviderCredentials,
  provider: CmsProvider,
  providerCollectionId: string,
): Promise<string> {
  const base = slugify(title);
  if (!base) {
    throw new AppError(
      "The title field must contain at least one letter or number.",
      400,
    );
  }

  const existingItems = await provider.listItems(credentials, providerCollectionId, {
    limit: MAX_ITEMS,
  });
  const existingSlugs = new Set(existingItems.map((item) => item.slug));

  let candidate = base;
  let suffix = 2;
  while (existingSlugs.has(candidate)) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
  return candidate;
}

function requireCredentialsAndProvider(project: Project) {
  const credentials = projectService.getDecryptedCredentials(project);
  if (!credentials) {
    throw new AppError("This project isn't connected to a CMS.", 400);
  }
  return { credentials, provider: resolveProvider(project.cmsProvider) };
}

export const itemService = {
  async listItems(
    project: Project,
    collection: CollectionConfig,
    params: ListItemsParams = {},
  ): Promise<ListItemsResult> {
    const { search, sortBy = "lastUpdated", sortOrder = "desc", page = 1, pageSize = 10 } = params;
    const { credentials, provider } = requireCredentialsAndProvider(project);

    const rawItems = await provider.listItems(
      credentials,
      collection.providerCollectionId,
      { limit: MAX_ITEMS },
    );
    let items = rawItems.map((raw) => mapProviderItemToItem(raw, collection));

    if (search?.trim()) {
      const needle = search.trim().toLowerCase();
      const textFieldKeys = collection.fields
        .filter((f) => f.type === "text")
        .map((f) => f.key);
      items = items.filter(
        (item) =>
          item.name.toLowerCase().includes(needle) ||
          textFieldKeys.some((key) => {
            const value = item.fieldData[key];
            return typeof value === "string" && value.toLowerCase().includes(needle);
          }),
      );
    }

    const dir = sortOrder === "asc" ? 1 : -1;
    items = [...items].sort((a, b) => {
      const aValue = getSortValue(a, sortBy);
      const bValue = getSortValue(b, sortBy);
      if (typeof aValue === "number" && typeof bValue === "number") {
        return (aValue - bValue) * dir;
      }
      if (typeof aValue === "boolean" && typeof bValue === "boolean") {
        return (Number(aValue) - Number(bValue)) * dir;
      }
      return String(aValue).localeCompare(String(bValue)) * dir;
    });

    const total = items.length;
    const start = (page - 1) * pageSize;
    return { items: items.slice(start, start + pageSize), total, page, pageSize };
  },

  async getItem(
    project: Project,
    collection: CollectionConfig,
    itemId: string,
  ): Promise<Item> {
    const { credentials, provider } = requireCredentialsAndProvider(project);
    const raw = await provider.getItem(credentials, collection.providerCollectionId, itemId);
    return mapProviderItemToItem(raw, collection);
  },

  /** `input.name` is required; `input.slug` is optional — left blank, the slug is generated from `name` instead (Section 4.6). */
  async createItem(
    project: Project,
    collection: CollectionConfig,
    input: Record<string, unknown>,
    publish: boolean,
  ): Promise<Item> {
    const { credentials, provider } = requireCredentialsAndProvider(project);

    const name = typeof input.name === "string" ? input.name : "";
    const slugInput = typeof input.slug === "string" ? input.slug.trim() : "";
    const slug = await generateUniqueSlug(
      slugInput || name,
      credentials,
      provider,
      collection.providerCollectionId,
    );

    const fieldData = mapInputToProviderFieldData(input, collection.fields, slug, name);
    const created = await provider.createItem(
      credentials,
      collection.providerCollectionId,
      fieldData,
      publish,
    );
    return mapProviderItemToItem(created, collection);
  },

  /** The slug is intentionally never regenerated on edit, even if `name` changes — this avoids silently breaking a published URL (Section 4.6). `name` itself stays freely editable. */
  async updateItem(
    project: Project,
    collection: CollectionConfig,
    itemId: string,
    input: Record<string, unknown>,
    publish: boolean,
  ): Promise<Item> {
    const { credentials, provider } = requireCredentialsAndProvider(project);

    const existing = await provider.getItem(
      credentials,
      collection.providerCollectionId,
      itemId,
    );
    const name = typeof input.name === "string" ? input.name : "";

    let slug = existing.slug;
    if (!slug) {
      const slugInput = typeof input.slug === "string" ? input.slug.trim() : "";
      slug = await generateUniqueSlug(
        slugInput || name,
        credentials,
        provider,
        collection.providerCollectionId,
      );
    }

    const fieldData = mapInputToProviderFieldData(input, collection.fields, slug, name);
    const updated = await provider.updateItem(
      credentials,
      collection.providerCollectionId,
      itemId,
      fieldData,
      publish,
    );
    return mapProviderItemToItem(updated, collection);
  },

  async deleteItem(
    project: Project,
    collection: CollectionConfig,
    itemId: string,
  ): Promise<void> {
    const { credentials, provider } = requireCredentialsAndProvider(project);
    await provider.deleteItem(credentials, collection.providerCollectionId, itemId);
  },

  async publishItem(
    project: Project,
    collection: CollectionConfig,
    itemId: string,
  ): Promise<Item> {
    const { credentials, provider } = requireCredentialsAndProvider(project);
    const published = await provider.publishItem(
      credentials,
      collection.providerCollectionId,
      itemId,
    );
    return mapProviderItemToItem(published, collection);
  },

  /** Moves a published item back to draft — removes it from the live site while keeping it in the CMS (Section 6). */
  async unpublishItem(
    project: Project,
    collection: CollectionConfig,
    itemId: string,
  ): Promise<Item> {
    const { credentials, provider } = requireCredentialsAndProvider(project);
    const unpublished = await provider.unpublishItem(
      credentials,
      collection.providerCollectionId,
      itemId,
    );
    return mapProviderItemToItem(unpublished, collection);
  },

  /** Total/published/draft counts for one collection — the per-project dashboard's item cards (Section 11). */
  async getCollectionStats(
    project: Project,
    collection: CollectionConfig,
  ): Promise<{ total: number; published: number; draft: number }> {
    const { credentials, provider } = requireCredentialsAndProvider(project);
    const rawItems = await provider.listItems(
      credentials,
      collection.providerCollectionId,
      { limit: MAX_ITEMS },
    );
    const published = rawItems.filter((item) => !item.isDraft).length;
    return { total: rawItems.length, published, draft: rawItems.length - published };
  },
};
