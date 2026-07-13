/**
 * Shapes returned by a project's CMS connection endpoints
 * (`/sites`, `/collections/available`, `/collections/:id/schema` —
 * Section 15) — the onboarding wizard renders these directly, so they live
 * in `shared` rather than server-only, unlike the rest of the `CmsProvider`
 * plumbing (Section 6), which the client never sees.
 */
export interface ProviderSite {
  id: string;
  name: string;
  shortName?: string;
}

export interface ProviderCollection {
  id: string;
  name: string;
  itemCount?: number;
}

export interface ProviderField {
  id: string;
  slug: string;
  displayName: string;
  type: string;
  isRequired: boolean;
}
