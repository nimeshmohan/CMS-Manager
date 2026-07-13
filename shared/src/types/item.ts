/**
 * A single entry within a managed collection, normalized into a generic
 * shape driven by the collection's `FieldMapping[]`. Never stored locally
 * except as an audit-log snapshot — the CMS provider remains the sole
 * source of truth for content (Section 14).
 */
export interface Item {
  id: string;
  collectionId: string;
  slug: string | null;
  /** Keyed by `FieldMapping.key`, not the provider's field slug. */
  fieldData: Record<string, unknown>;
  published: boolean;
  createdOn: string;
  lastUpdated: string;
}
