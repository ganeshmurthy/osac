import { type MessageInitShape, create } from '@bufbuild/protobuf';
import { useMutation } from '@tanstack/react-query';

import { FieldMaskSchema, type Model, ModelSchema, Models } from '@osac/types';

import { useApiFetch } from '../api-context';
import { apiQueryKey } from '../types';
import { useApiQuery, useApiQueryClient } from '../use-api-query';

const MODEL_PAGE_SIZE = 100;

export const useModels = () => {
  const client = useApiFetch(Models);
  return useApiQuery({
    queryKey: apiQueryKey('v1/models'),
    queryFn: async ({ signal }) => {
      const items: Model[] = [];
      let total = 0;
      do {
        const page = await client.list(
          { offset: items.length, limit: MODEL_PAGE_SIZE },
          { signal },
        );
        items.push(...page.items);
        total = page.total;
      } while (items.length < total);
      return items;
    },
  });
};

export const useModel = (id?: string) => {
  const client = useApiFetch(Models);
  return useApiQuery({
    queryKey: apiQueryKey('v1/models', [id]),
    queryFn: async () => {
      const response = await client.get({ id: id ?? '' });
      if (!response.object) {
        throw new Error('Model response is missing its object');
      }
      return response.object;
    },
    enabled: Boolean(id),
  });
};

export const useModelPlacementClusters = () => {
  const client = useApiFetch(Models);
  return useApiQuery({
    queryKey: apiQueryKey('v1/models', ['placement-clusters']),
    queryFn: async () => (await client.listPlacementClusters({})).clusters,
  });
};

export const useCreateModel = () => {
  const client = useApiFetch(Models);
  const queryClient = useApiQueryClient();
  return useMutation({
    mutationFn: async (object: MessageInitShape<typeof ModelSchema>) => {
      const response = await client.create({ object });
      if (!response.object) {
        throw new Error('Create response is missing its model object');
      }
      return response.object;
    },
    onSuccess: async () => queryClient.invalidateQueries({ queryKey: apiQueryKey('v1/models') }),
  });
};

export type UpdateModelInput = {
  object: MessageInitShape<typeof ModelSchema>;
  paths: string[];
};

export const useUpdateModel = () => {
  const client = useApiFetch(Models);
  const queryClient = useApiQueryClient();
  return useMutation({
    mutationFn: async ({ object, paths }: UpdateModelInput) => {
      const response = await client.update({
        object,
        updateMask: create(FieldMaskSchema, { paths }),
        lock: true,
      });
      if (!response.object) {
        throw new Error('Update response is missing its model object');
      }
      return response.object;
    },
    onSuccess: async () => queryClient.invalidateQueries({ queryKey: apiQueryKey('v1/models') }),
  });
};

export const useDeleteModel = () => {
  const client = useApiFetch(Models);
  const queryClient = useApiQueryClient();
  return useMutation({
    mutationFn: async (id: string) => client.delete({ id }),
    onSuccess: async () => queryClient.invalidateQueries({ queryKey: apiQueryKey('v1/models') }),
  });
};
