import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Item } from "@cms-manager/shared";
import { apiClient } from "@/lib/apiClient";

export interface ListItemsParams {
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}

export interface ListItemsResult {
  items: Item[];
  total: number;
  page: number;
  pageSize: number;
}

/** Scoped by projectId/collectionId (Section 16) — caching never leaks across projects/collections a user later loses access to. */
function itemsBasePath(projectId: string, collectionId: string): string {
  return `/api/projects/${projectId}/collections/${collectionId}/items`;
}

function itemsKey(projectId: string, collectionId: string) {
  return ["projects", projectId, "collections", collectionId, "items"] as const;
}

export function useItems(
  projectId: string,
  collectionId: string,
  params: ListItemsParams,
  enabled: boolean,
) {
  return useQuery({
    queryKey: [...itemsKey(projectId, collectionId), params],
    queryFn: () =>
      apiClient.get<ListItemsResult>(itemsBasePath(projectId, collectionId), {
        ...params,
      }),
    enabled,
    placeholderData: keepPreviousData,
  });
}

export function useItem(
  projectId: string,
  collectionId: string,
  itemId: string | undefined,
) {
  return useQuery({
    queryKey: [...itemsKey(projectId, collectionId), itemId],
    queryFn: () =>
      apiClient.get<{ item: Item }>(
        `${itemsBasePath(projectId, collectionId)}/${itemId}`,
      ),
    select: (data) => data.item,
    enabled: Boolean(itemId),
  });
}

export function useCreateItem(projectId: string, collectionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Record<string, unknown>) =>
      apiClient.post<{ item: Item }>(itemsBasePath(projectId, collectionId), input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: itemsKey(projectId, collectionId) });
    },
  });
}

export function useUpdateItem(projectId: string, collectionId: string, itemId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Record<string, unknown>) =>
      apiClient.patch<{ item: Item }>(
        `${itemsBasePath(projectId, collectionId)}/${itemId}`,
        input,
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: itemsKey(projectId, collectionId) });
    },
  });
}

export function useDeleteItem(projectId: string, collectionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (itemId: string) =>
      apiClient.del<void>(`${itemsBasePath(projectId, collectionId)}/${itemId}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: itemsKey(projectId, collectionId) });
    },
  });
}

export function usePublishItem(projectId: string, collectionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (itemId: string) =>
      apiClient.post<{ item: Item }>(
        `${itemsBasePath(projectId, collectionId)}/${itemId}/publish`,
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: itemsKey(projectId, collectionId) });
    },
  });
}

/** Uploads an image file and returns its hosted URL — the value an image `FieldMapping` is set to on save (Section 6). Not a mutation on the item itself, so it doesn't invalidate the items query. */
export function useUploadImage(projectId: string, collectionId: string) {
  return useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      return apiClient.upload<{ url: string }>(
        `${itemsBasePath(projectId, collectionId)}/assets`,
        formData,
      );
    },
  });
}

export function useUnpublishItem(projectId: string, collectionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (itemId: string) =>
      apiClient.post<{ item: Item }>(
        `${itemsBasePath(projectId, collectionId)}/${itemId}/unpublish`,
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: itemsKey(projectId, collectionId) });
    },
  });
}
