import type {
  ApiCredentials,
  ProviderCollection,
  ProviderField,
  ProviderSite,
} from "@cms-manager/shared";

/** Alias for clarity at provider call sites — identical shape to `ApiCredentials` (Section 6). */
export type ProviderCredentials = ApiCredentials;

/**
 * A normalized CMS item — the provider-specific shape (Webflow's `isDraft`,
 * `fieldData`, etc.) already translated to this common shape by the
 * adapter. `ItemService` (Phase 6) maps this onto the shared `Item` type
 * using a collection's `FieldMapping[]`.
 */
export interface ProviderItem {
  id: string;
  name: string;
  slug: string;
  isDraft: boolean;
  fieldData: Record<string, unknown>;
  createdOn: string;
  lastUpdated: string;
}

export interface ListParams {
  limit?: number;
  offset?: number;
}

/** A file held in memory (multer's default storage — Section 6), not yet uploaded to any provider. */
export interface ProviderFile {
  buffer: Buffer;
  filename: string;
  mimetype: string;
}

/**
 * Every provider-specific adapter (Webflow today; WordPress, Contentful,
 * Sanity, Shopify plausible later — Section 6) implements this exact
 * interface. Nothing outside a provider's own file may depend on
 * provider-specific request/response shapes, auth headers, or endpoint
 * paths — that's what keeps adding a new provider a one-file change.
 */
export interface CmsProvider {
  testConnection(credentials: ProviderCredentials): Promise<boolean>;
  listSites(credentials: ProviderCredentials): Promise<ProviderSite[]>;
  listCollections(
    credentials: ProviderCredentials,
    siteId: string,
  ): Promise<ProviderCollection[]>;
  getCollectionSchema(
    credentials: ProviderCredentials,
    collectionId: string,
  ): Promise<ProviderField[]>;
  listItems(
    credentials: ProviderCredentials,
    collectionId: string,
    params: ListParams,
  ): Promise<ProviderItem[]>;
  getItem(
    credentials: ProviderCredentials,
    collectionId: string,
    itemId: string,
  ): Promise<ProviderItem>;
  createItem(
    credentials: ProviderCredentials,
    collectionId: string,
    fieldData: Record<string, unknown>,
    publish: boolean,
  ): Promise<ProviderItem>;
  updateItem(
    credentials: ProviderCredentials,
    collectionId: string,
    itemId: string,
    fieldData: Record<string, unknown>,
    publish: boolean,
  ): Promise<ProviderItem>;
  deleteItem(
    credentials: ProviderCredentials,
    collectionId: string,
    itemId: string,
  ): Promise<void>;
  publishItem(
    credentials: ProviderCredentials,
    collectionId: string,
    itemId: string,
  ): Promise<ProviderItem>;
  unpublishItem(
    credentials: ProviderCredentials,
    collectionId: string,
    itemId: string,
  ): Promise<ProviderItem>;
  /** Registers and uploads a file as a site asset, returning the hosted URL an image field can reference (Section 6). */
  uploadAsset(
    credentials: ProviderCredentials,
    siteId: string,
    file: ProviderFile,
  ): Promise<{ url: string }>;
  /** Deploys the site itself — "staging" reaches only the free `*.webflow.io` domain, "live" reaches every custom domain too (Section 6). Distinct from an item's own publish state. */
  publishSite(
    credentials: ProviderCredentials,
    siteId: string,
    target: "staging" | "live",
  ): Promise<void>;
}
