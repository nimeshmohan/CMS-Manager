import type { Project } from "@cms-manager/shared";
import { itemService } from "./itemService";
import { projectService } from "./projectService";

export interface CollectionStat {
  collectionId: string;
  collectionName: string;
  total: number;
  published: number;
  draft: number;
}

export interface ProjectSummary {
  collections: CollectionStat[];
}

export interface PlatformSummary {
  totalProjects: number;
  activeProjects: number;
  archivedProjects: number;
}

export const dashboardService = {
  /**
   * Item counts per collection, aggregated across whichever collections
   * the caller can view — `"all"` for Super Admins and Project Managers,
   * an explicit set for everyone else (Section 11). A project with no CMS
   * connection yet, or with collections the caller can't see, simply
   * contributes nothing to the list rather than erroring.
   */
  async getProjectSummary(
    project: Project,
    viewableCollectionIds: "all" | Set<string>,
  ): Promise<ProjectSummary> {
    if (!project.connectionMethod) {
      return { collections: [] };
    }

    const collections = project.collections.filter(
      (c) => viewableCollectionIds === "all" || viewableCollectionIds.has(c.id),
    );

    const stats = await Promise.all(
      collections.map(async (collection): Promise<CollectionStat> => {
        const { total, published, draft } = await itemService.getCollectionStats(
          project,
          collection,
        );
        return { collectionId: collection.id, collectionName: collection.name, total, published, draft };
      }),
    );

    return { collections: stats };
  },

  async getPlatformSummary(): Promise<PlatformSummary> {
    const allProjects = await projectService.listProjectsForUser({
      uid: "",
      isSuperAdmin: true,
    });
    const activeProjects = allProjects.filter((p) => p.status === "active").length;
    return {
      totalProjects: allProjects.length,
      activeProjects,
      archivedProjects: allProjects.length - activeProjects,
    };
  },
};
