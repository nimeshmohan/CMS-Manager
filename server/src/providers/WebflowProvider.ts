import { AppError } from "../utils/AppError";
import type {
  CmsProvider,
  ListParams,
  ProviderCredentials,
  ProviderItem,
} from "./CmsProvider";
import type {
  ProviderCollection,
  ProviderField,
  ProviderSite,
} from "@cms-manager/shared";

const WEBFLOW_API_BASE = "https://api.webflow.com/v2";

async function webflowFetch<T>(
  credentials: ProviderCredentials,
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${WEBFLOW_API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${credentials.accessToken}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new AppError(
      `Webflow API error (${response.status}): ${body || response.statusText}`,
      502,
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

interface WebflowSite {
  id: string;
  displayName: string;
  shortName: string;
}

interface WebflowCollectionSummary {
  id: string;
  displayName: string;
}

interface WebflowCollectionField {
  id: string;
  slug: string;
  displayName: string;
  type: string;
  isRequired: boolean;
}

interface WebflowCollectionDetail extends WebflowCollectionSummary {
  fields: WebflowCollectionField[];
}

interface WebflowItem {
  id: string;
  isDraft: boolean;
  createdOn: string;
  lastUpdated: string;
  fieldData: Record<string, unknown>;
}

function toProviderItem(item: WebflowItem): ProviderItem {
  return {
    id: item.id,
    name: typeof item.fieldData.name === "string" ? item.fieldData.name : "",
    slug: typeof item.fieldData.slug === "string" ? item.fieldData.slug : "",
    isDraft: item.isDraft,
    fieldData: item.fieldData,
    createdOn: item.createdOn,
    lastUpdated: item.lastUpdated,
  };
}

async function listSites(
  credentials: ProviderCredentials,
): Promise<ProviderSite[]> {
  const data = await webflowFetch<{ sites: WebflowSite[] }>(
    credentials,
    "/sites",
  );
  return data.sites.map((site) => ({
    id: site.id,
    name: site.displayName,
    shortName: site.shortName,
  }));
}

async function listCollections(
  credentials: ProviderCredentials,
  siteId: string,
): Promise<ProviderCollection[]> {
  const data = await webflowFetch<{ collections: WebflowCollectionSummary[] }>(
    credentials,
    `/sites/${siteId}/collections`,
  );
  return data.collections.map((collection) => ({
    id: collection.id,
    name: collection.displayName,
  }));
}

async function getCollectionSchema(
  credentials: ProviderCredentials,
  collectionId: string,
): Promise<ProviderField[]> {
  const data = await webflowFetch<WebflowCollectionDetail>(
    credentials,
    `/collections/${collectionId}`,
  );
  return data.fields.map((field) => ({
    id: field.id,
    slug: field.slug,
    displayName: field.displayName,
    type: field.type,
    isRequired: field.isRequired,
  }));
}

async function listItems(
  credentials: ProviderCredentials,
  collectionId: string,
  params: ListParams,
): Promise<ProviderItem[]> {
  const query = new URLSearchParams();
  if (params.limit) query.set("limit", String(params.limit));
  if (params.offset) query.set("offset", String(params.offset));
  const qs = query.toString();

  const data = await webflowFetch<{ items: WebflowItem[] }>(
    credentials,
    `/collections/${collectionId}/items${qs ? `?${qs}` : ""}`,
  );
  return data.items.map(toProviderItem);
}

async function getItem(
  credentials: ProviderCredentials,
  collectionId: string,
  itemId: string,
): Promise<ProviderItem> {
  const item = await webflowFetch<WebflowItem>(
    credentials,
    `/collections/${collectionId}/items/${itemId}`,
  );
  return toProviderItem(item);
}

/**
 * Webflow has no single-item "publish" flag on create/update — `isDraft:
 * false` only marks an item ready; a separate call to `.../items/publish`
 * actually pushes it live (Section 6). `createItem`/`updateItem` make that
 * second call automatically when the caller asks to publish.
 */
async function publishItem(
  credentials: ProviderCredentials,
  collectionId: string,
  itemId: string,
): Promise<ProviderItem> {
  await webflowFetch<unknown>(
    credentials,
    `/collections/${collectionId}/items/publish`,
    { method: "POST", body: JSON.stringify({ itemIds: [itemId] }) },
  );
  return getItem(credentials, collectionId, itemId);
}

/**
 * Moves a live item back to draft: PATCHes the staged item to `isDraft:
 * true` (so it reads as a draft everywhere in this tool), then removes it
 * from the live site via the `/live` endpoint — the counterpart to
 * `publishItem`'s two-step push (Section 6).
 */
async function unpublishItem(
  credentials: ProviderCredentials,
  collectionId: string,
  itemId: string,
): Promise<ProviderItem> {
  const current = await getItem(credentials, collectionId, itemId);
  await webflowFetch<WebflowItem>(
    credentials,
    `/collections/${collectionId}/items/${itemId}`,
    {
      method: "PATCH",
      body: JSON.stringify({ isDraft: true, fieldData: current.fieldData }),
    },
  );
  await webflowFetch<unknown>(
    credentials,
    `/collections/${collectionId}/items/${itemId}/live`,
    { method: "DELETE" },
  );
  return getItem(credentials, collectionId, itemId);
}

async function createItem(
  credentials: ProviderCredentials,
  collectionId: string,
  fieldData: Record<string, unknown>,
  publish: boolean,
): Promise<ProviderItem> {
  const item = await webflowFetch<WebflowItem>(
    credentials,
    `/collections/${collectionId}/items`,
    {
      method: "POST",
      body: JSON.stringify({ isDraft: !publish, fieldData }),
    },
  );
  const created = toProviderItem(item);
  return publish
    ? publishItem(credentials, collectionId, created.id)
    : created;
}

async function updateItem(
  credentials: ProviderCredentials,
  collectionId: string,
  itemId: string,
  fieldData: Record<string, unknown>,
  publish: boolean,
): Promise<ProviderItem> {
  const item = await webflowFetch<WebflowItem>(
    credentials,
    `/collections/${collectionId}/items/${itemId}`,
    {
      method: "PATCH",
      body: JSON.stringify({ isDraft: !publish, fieldData }),
    },
  );
  const updated = toProviderItem(item);
  return publish
    ? publishItem(credentials, collectionId, updated.id)
    : updated;
}

async function deleteItem(
  credentials: ProviderCredentials,
  collectionId: string,
  itemId: string,
): Promise<void> {
  await webflowFetch<void>(
    credentials,
    `/collections/${collectionId}/items/${itemId}`,
    { method: "DELETE" },
  );
}

async function testConnection(
  credentials: ProviderCredentials,
): Promise<boolean> {
  try {
    await listSites(credentials);
    return true;
  } catch {
    return false;
  }
}

export const webflowProvider: CmsProvider = {
  testConnection,
  listSites,
  listCollections,
  getCollectionSchema,
  listItems,
  getItem,
  createItem,
  updateItem,
  deleteItem,
  publishItem,
  unpublishItem,
};
