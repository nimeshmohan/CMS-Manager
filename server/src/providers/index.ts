import type { CmsProvider as CmsProviderId } from "@cms-manager/shared";
import type { CmsProvider } from "./CmsProvider";
import { webflowProvider } from "./WebflowProvider";

/**
 * Resolves a project's `cmsProvider` field to its adapter. Adding a new
 * provider (WordPress, Contentful, Sanity, Shopify — Section 6) means one
 * new adapter file plus one new case here; nothing else in the app depends
 * on which provider a project uses.
 */
export function resolveProvider(providerId: CmsProviderId): CmsProvider {
  switch (providerId) {
    case "webflow":
      return webflowProvider;
    default: {
      const exhaustiveCheck: never = providerId;
      throw new Error(`Unsupported CMS provider: ${exhaustiveCheck as string}`);
    }
  }
}

export type { CmsProvider, ProviderCredentials, ProviderItem, ListParams } from "./CmsProvider";
