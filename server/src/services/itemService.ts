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
  /** A `FieldMapping.key`, or the system columns `lastUpdated` | `createdOn` | `published`. */
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

function findTitleField(fields: FieldMapping[]): FieldMapping | undefined {
  return fields.find((f) => f.isTitleField);
}

function mapProviderItemToItem(
  providerItem: ProviderItem,
  collection: CollectionConfig,
): Item {
  const fieldData: Record<string, unknown> = {};
  for (const field of collection.fields) {
    const raw = providerItem.fieldData[field.providerFieldSlug];
    fieldData[field.key] =
      raw ?? (field.type === "boolean" ? false : field.type === "number" ? undefined : "");
  }
  return {
    id: providerItem.id,
    collectionId: collection.id,
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
 * project (Section 4.5/9).
 *
 * Webflow requires its built-in `name` field on every item, separate from
 * `slug` and from whatever provider field the user's title `FieldMapping`
 * happens to be mapped to — it's set here unconditionally so an item never
 * fails to save just because `name` isn't one of the mapped fields.
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
      items = items.filter((item) =>
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

  async createItem(
    project: Project,
    collection: CollectionConfig,
    input: Record<string, unknown>,
    publish: boolean,
  ): Promise<Item> {
    const { credentials, provider } = requireCredentialsAndProvider(project);

    const titleField = findTitleField(collection.fields);
    const titleValue = titleField ? input[titleField.key] : undefined;
    const name = typeof titleValue === "string" && titleValue ? titleValue : collection.name;
    const slug = await generateUniqueSlug(
      name,
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

  /** The slug is intentionally never regenerated on edit, even if the title field changes — this avoids silently breaking a published URL (Section 4.6). */
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
    const titleField = findTitleField(collection.fields);
    const titleValue = titleField ? input[titleField.key] : undefined;
    const name = typeof titleValue === "string" && titleValue ? titleValue : collection.name;

    let slug = existing.slug;
    if (!slug) {
      slug = await generateUniqueSlug(
        name,
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

  /** There's no single-item "unpublish" in Webflow — this only ever pushes an item live, never retroactively removes a published one (Section 6). */
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
