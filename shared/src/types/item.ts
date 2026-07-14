/**
 * What a create/edit form save should do, distinct from the item's own
 * `published` state (Section 6): "draft" never touches the live item or
 * the site; "staging" marks the item live and deploys the site to only
 * its free `*.webflow.io` preview domain; "live" does the same but also
 * deploys to every custom domain, actually going public.
 */
export const PUBLISH_TARGETS = ["draft", "staging", "live"] as const;
export type PublishTarget = (typeof PUBLISH_TARGETS)[number];

/**
 * A single entry within a managed collection, normalized into a generic
 * shape driven by the collection's `FieldMapping[]`. Never stored locally
 * except as an audit-log snapshot — the CMS provider remains the sole
 * source of truth for content (Section 14).
 */
export interface Item {
  id: string;
  collectionId: string;
  /** Webflow's built-in item name — every item has one, distinct from any mapped field (Section 4.6). */
  name: string;
  slug: string | null;
  /** Keyed by `FieldMapping.key`, not the provider's field slug. */
  fieldData: Record<string, unknown>;
  published: boolean;
  createdOn: string;
  lastUpdated: string;
}
