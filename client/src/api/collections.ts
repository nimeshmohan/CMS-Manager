import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  CollectionConfig,
  FieldMapping,
  Project,
  ProviderCollection,
  ProviderField,
} from "@cms-manager/shared";
import { apiClient } from "@/lib/apiClient";
import { projectKeys } from "./projects";

function availableCollectionsKey(projectId: string) {
  return [...projectKeys.detail(projectId), "collections", "available"] as const;
}

function collectionSchemaKey(projectId: string, collectionId: string) {
  return [
    ...projectKeys.detail(projectId),
    "collections",
    collectionId,
    "schema",
  ] as const;
}

/** Collections on the connected site not yet managed by this project (Section 4.4 step 5). */
export function useAvailableCollections(projectId: string, enabled: boolean) {
  return useQuery({
    queryKey: availableCollectionsKey(projectId),
    queryFn: () =>
      apiClient.get<{ collections: ProviderCollection[] }>(
        `/api/projects/${projectId}/collections/available`,
      ),
    select: (data) => data.collections,
    enabled,
  });
}

export function useAddCollection(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { providerCollectionId: string; name: string }) =>
      apiClient.post<{ project: Project; collection: CollectionConfig }>(
        `/api/projects/${projectId}/collections`,
        input,
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: projectKeys.detail(projectId) });
      void queryClient.invalidateQueries({ queryKey: availableCollectionsKey(projectId) });
    },
  });
}

/** Live field schema for the mapping editor's auto-suggest (Section 4.4 step 8). */
export function useCollectionSchema(
  projectId: string,
  collectionId: string,
  enabled: boolean,
) {
  return useQuery({
    queryKey: collectionSchemaKey(projectId, collectionId),
    queryFn: () =>
      apiClient.get<{ fields: ProviderField[] }>(
        `/api/projects/${projectId}/collections/${collectionId}/schema`,
      ),
    select: (data) => data.fields,
    enabled,
  });
}

export function useUpdateCollectionFields(
  projectId: string,
  collectionId: string,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (fields: FieldMapping[]) =>
      apiClient.patch<{ project: Project }>(
        `/api/projects/${projectId}/collections/${collectionId}`,
        { fields },
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: projectKeys.detail(projectId) });
    },
  });
}

export function useRemoveCollection(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (collectionId: string) =>
      apiClient.del<{ project: Project }>(
        `/api/projects/${projectId}/collections/${collectionId}`,
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: projectKeys.detail(projectId) });
    },
  });
}
