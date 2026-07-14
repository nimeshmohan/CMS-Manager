import { randomBytes } from "node:crypto";
import type { WriteBatch } from "firebase-admin/firestore";
import {
  autoMapFields,
  SEEDED_ROLE_IDS,
  type ApiCredentials,
  type CollectionConfig,
  type Project,
  type ProviderCollection,
  type ProviderSite,
} from "@cms-manager/shared";
import { firestore } from "../config/firebaseAdmin";
import { AppError } from "../utils/AppError";
import { decrypt, encrypt } from "../utils/encryption";
import { resolveProvider, type ProviderCredentials } from "../providers";
import { membershipService } from "./membershipService";

const PROJECTS_COLLECTION = "projects";

interface CreateProjectInput {
  name: string;
  clientName: string;
  description: string;
  logoUrl: string | null;
  createdBy: string;
}

type UpdatableProjectFields = Partial<
  Pick<Project, "name" | "clientName" | "description" | "logoUrl">
>;

/** Grants the creator a Project Manager Membership on `projectId`, written in the same batch as the project itself (Section 3.3). */
function addCreatorAsProjectManager(
  batch: WriteBatch,
  projectId: string,
  createdBy: string,
): void {
  const membership = membershipService.buildMembership({
    projectId,
    userId: createdBy,
    roleId: SEEDED_ROLE_IDS.PROJECT_MANAGER,
    isProjectManager: true,
    // No collections exist yet on a freshly created/duplicated project
    // (Webflow connection is a separate step — Section 4.3/4.4); the
    // Project Manager's per-collection grants are added as each
    // collection is configured.
    collectionPermissions: [],
    invitedBy: createdBy,
  });
  batch.set(
    membershipService.membershipDocRef(projectId, createdBy),
    membership,
  );
}

async function getProjectOrThrow(id: string): Promise<Project> {
  const doc = await firestore.collection(PROJECTS_COLLECTION).doc(id).get();
  if (!doc.exists) {
    throw new AppError("Project not found.", 404);
  }
  return doc.data() as Project;
}

function decryptCredentials(
  credentials: ApiCredentials,
): ProviderCredentials {
  return {
    method: credentials.method,
    accessToken: decrypt(credentials.accessToken),
    refreshToken: credentials.refreshToken
      ? decrypt(credentials.refreshToken)
      : undefined,
  };
}

/** If exactly one site is available, auto-select it (Section 4.4 step 4 skips the picker when there's only one choice). */
function autoSelectSiteId(sites: ProviderSite[]): string | null {
  return sites.length === 1 ? sites[0]!.id : null;
}

/** `CollectionConfig` entries are embedded in the project doc's `collections` array, not separate Firestore docs, so this is purely local ID generation. */
function newCollectionId(): string {
  return randomBytes(12).toString("hex");
}

function requireDecryptedCredentials(project: Project): ProviderCredentials {
  if (!project.apiCredentials) {
    throw new AppError("This project isn't connected to a CMS yet.", 400);
  }
  return decryptCredentials(project.apiCredentials);
}

export const projectService = {
  async createProject(input: CreateProjectInput): Promise<Project> {
    const docRef = firestore.collection(PROJECTS_COLLECTION).doc();
    const now = new Date().toISOString();

    const project: Project = {
      id: docRef.id,
      name: input.name,
      clientName: input.clientName,
      description: input.description,
      logoUrl: input.logoUrl,
      cmsProvider: "webflow",
      siteId: null,
      connectionMethod: null,
      apiCredentials: null,
      collections: [],
      settings: {},
      status: "active",
      createdAt: now,
      updatedAt: now,
      createdBy: input.createdBy,
    };

    const batch = firestore.batch();
    batch.set(docRef, project);
    addCreatorAsProjectManager(batch, docRef.id, input.createdBy);
    await batch.commit();

    return project;
  },

  async getProject(id: string): Promise<Project | null> {
    const doc = await firestore.collection(PROJECTS_COLLECTION).doc(id).get();
    return doc.exists ? (doc.data() as Project) : null;
  },

  async listProjectsForUser(user: {
    uid: string;
    isSuperAdmin: boolean;
  }): Promise<Project[]> {
    if (user.isSuperAdmin) {
      const snapshot = await firestore.collection(PROJECTS_COLLECTION).get();
      return snapshot.docs.map((doc) => doc.data() as Project);
    }

    const memberships = await membershipService.listMembershipsForUser(
      user.uid,
    );
    if (memberships.length === 0) return [];

    const docs = await firestore.getAll(
      ...memberships.map((m) =>
        firestore.collection(PROJECTS_COLLECTION).doc(m.projectId),
      ),
    );
    return docs
      .filter((doc) => doc.exists)
      .map((doc) => doc.data() as Project);
  },

  async updateProject(
    id: string,
    patch: UpdatableProjectFields,
  ): Promise<Project> {
    const existing = await getProjectOrThrow(id);
    const updatedAt = new Date().toISOString();
    await firestore
      .collection(PROJECTS_COLLECTION)
      .doc(id)
      .update({ ...patch, updatedAt });
    return { ...existing, ...patch, updatedAt };
  },

  async setArchived(id: string, archived: boolean): Promise<Project> {
    const existing = await getProjectOrThrow(id);
    const status: Project["status"] = archived ? "archived" : "active";
    const updatedAt = new Date().toISOString();
    await firestore
      .collection(PROJECTS_COLLECTION)
      .doc(id)
      .update({ status, updatedAt });
    return { ...existing, status, updatedAt };
  },

  async deleteProject(id: string): Promise<void> {
    const memberships = await membershipService.listMembershipsForProject(id);
    const batch = firestore.batch();
    batch.delete(firestore.collection(PROJECTS_COLLECTION).doc(id));
    for (const membership of memberships) {
      batch.delete(
        membershipService.membershipDocRef(
          membership.projectId,
          membership.userId,
        ),
      );
    }
    await batch.commit();
  },

  /**
   * Clones a project's configuration (name is replaced, everything else
   * copied) but not its items, memberships, or activity log — and never
   * its CMS connection, which must be reconnected (Section 4.2). The
   * duplicator becomes the new project's sole Project Manager, same as
   * any newly created project (Section 3.3).
   */
  async duplicateProject(id: string, newName: string, createdBy: string): Promise<Project> {
    const original = await getProjectOrThrow(id);
    const docRef = firestore.collection(PROJECTS_COLLECTION).doc();
    const now = new Date().toISOString();

    const duplicate: Project = {
      ...original,
      id: docRef.id,
      name: newName,
      collections: original.collections.map((collection) => ({
        ...collection,
        projectId: docRef.id,
      })),
      siteId: null,
      connectionMethod: null,
      apiCredentials: null,
      createdAt: now,
      updatedAt: now,
      createdBy,
    };

    const batch = firestore.batch();
    batch.set(docRef, duplicate);
    addCreatorAsProjectManager(batch, docRef.id, createdBy);
    await batch.commit();

    return duplicate;
  },

  /** Never send a project's CMS credential — encrypted or otherwise — to the client (Section 9). Call before every `res.json` that includes a project. */
  toSafeProject(project: Project): Project {
    return { ...project, apiCredentials: null };
  },

  /** Decrypts a project's stored credential for server-side provider calls only. Never returned from a route. */
  getDecryptedCredentials(project: Project): ProviderCredentials | null {
    return project.apiCredentials
      ? decryptCredentials(project.apiCredentials)
      : null;
  },

  /**
   * Validates a pasted API token against the live provider (Section 4.4
   * step 3) before persisting anything, then stores it encrypted. If the
   * token only grants access to one site, that site is selected
   * automatically; otherwise the caller picks from the returned list.
   */
  async connectWithApiToken(
    id: string,
    apiToken: string,
  ): Promise<{ project: Project; sites: ProviderSite[] }> {
    const existing = await getProjectOrThrow(id);
    const provider = resolveProvider(existing.cmsProvider);
    const credentials: ProviderCredentials = {
      method: "apiToken",
      accessToken: apiToken,
    };

    const connected = await provider.testConnection(credentials);
    if (!connected) {
      throw new AppError(
        "Could not connect with that API token. Check the token and try again.",
        400,
      );
    }

    const sites = await provider.listSites(credentials);
    const updatedAt = new Date().toISOString();
    const patch: Pick<
      Project,
      "connectionMethod" | "apiCredentials" | "siteId" | "updatedAt"
    > = {
      connectionMethod: "apiToken",
      apiCredentials: { method: "apiToken", accessToken: encrypt(apiToken) },
      siteId: autoSelectSiteId(sites),
      updatedAt,
    };

    await firestore.collection(PROJECTS_COLLECTION).doc(id).update(patch);
    return { project: { ...existing, ...patch }, sites };
  },

  /** Same validate-then-persist flow as `connectWithApiToken`, for a token pair obtained via the OAuth callback. */
  async connectWithOAuth(
    id: string,
    accessToken: string,
    refreshToken: string | undefined,
  ): Promise<{ project: Project; sites: ProviderSite[] }> {
    const existing = await getProjectOrThrow(id);
    const provider = resolveProvider(existing.cmsProvider);
    const credentials: ProviderCredentials = {
      method: "oauth",
      accessToken,
      refreshToken,
    };

    const connected = await provider.testConnection(credentials);
    if (!connected) {
      throw new AppError("Could not connect to Webflow. Please try again.", 400);
    }

    const sites = await provider.listSites(credentials);
    const updatedAt = new Date().toISOString();
    const patch: Pick<
      Project,
      "connectionMethod" | "apiCredentials" | "siteId" | "updatedAt"
    > = {
      connectionMethod: "oauth",
      apiCredentials: {
        method: "oauth",
        accessToken: encrypt(accessToken),
        ...(refreshToken ? { refreshToken: encrypt(refreshToken) } : {}),
      },
      siteId: autoSelectSiteId(sites),
      updatedAt,
    };

    await firestore.collection(PROJECTS_COLLECTION).doc(id).update(patch);
    return { project: { ...existing, ...patch }, sites };
  },

  /** Re-fetches the site list for an already-connected project (e.g. the wizard's site-picker step, or "Reconnect"). */
  async listSitesForProject(id: string): Promise<ProviderSite[]> {
    const project = await getProjectOrThrow(id);
    const credentials = requireDecryptedCredentials(project);
    return resolveProvider(project.cmsProvider).listSites(credentials);
  },

  async selectSite(id: string, siteId: string): Promise<Project> {
    const existing = await getProjectOrThrow(id);
    if (!existing.connectionMethod) {
      throw new AppError(
        "Connect this project to a CMS before selecting a site.",
        400,
      );
    }
    const updatedAt = new Date().toISOString();
    await firestore
      .collection(PROJECTS_COLLECTION)
      .doc(id)
      .update({ siteId, updatedAt });
    return { ...existing, siteId, updatedAt };
  },

  /** Live collections on the project's selected site that aren't managed yet (Section 4.4 step 5). */
  async listAvailableCollections(id: string): Promise<ProviderCollection[]> {
    const project = await getProjectOrThrow(id);
    if (!project.siteId) {
      throw new AppError("Select a site before choosing collections.", 400);
    }
    const credentials = requireDecryptedCredentials(project);
    const collections = await resolveProvider(project.cmsProvider).listCollections(
      credentials,
      project.siteId,
    );
    const managedIds = new Set(project.collections.map((c) => c.providerCollectionId));
    return collections.filter((c) => !managedIds.has(c.id));
  },

  /**
   * Adds a collection to the project's managed set (Section 4.4 step 6) —
   * only the selected collections are ever persisted or referenced again.
   * Its `fields` are auto-mapped from the provider's live schema right
   * here, immediately, the same way a real CMS dashboard works — there's
   * no separate manual field-mapping step to complete before items can be
   * created.
   */
  async addCollection(
    id: string,
    providerCollectionId: string,
    name: string,
  ): Promise<{ project: Project; collection: CollectionConfig }> {
    const existing = await getProjectOrThrow(id);
    if (
      existing.collections.some(
        (c) => c.providerCollectionId === providerCollectionId,
      )
    ) {
      throw new AppError(
        "This collection is already managed by this project.",
        409,
      );
    }

    const credentials = requireDecryptedCredentials(existing);
    const schema = await resolveProvider(existing.cmsProvider).getCollectionSchema(
      credentials,
      providerCollectionId,
    );

    const now = new Date().toISOString();
    const collection: CollectionConfig = {
      id: newCollectionId(),
      projectId: id,
      name,
      providerCollectionId,
      fields: autoMapFields(schema),
      createdAt: now,
      updatedAt: now,
    };
    const collections = [...existing.collections, collection];

    await firestore
      .collection(PROJECTS_COLLECTION)
      .doc(id)
      .update({ collections, updatedAt: now });
    return { project: { ...existing, collections, updatedAt: now }, collection };
  },

  async removeCollection(id: string, collectionId: string): Promise<Project> {
    const existing = await getProjectOrThrow(id);
    const collections = existing.collections.filter((c) => c.id !== collectionId);
    if (collections.length === existing.collections.length) {
      throw new AppError("Collection not found.", 404);
    }

    const now = new Date().toISOString();
    await firestore
      .collection(PROJECTS_COLLECTION)
      .doc(id)
      .update({ collections, updatedAt: now });
    return { ...existing, collections, updatedAt: now };
  },
};
