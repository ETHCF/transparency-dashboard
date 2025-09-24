export interface PaginationParams {
  limit?: number;
  offset?: number;
}

export const toPaginationQuery = (params: PaginationParams) => {
  const query: Record<string, number | undefined> = {};

  if (params.limit !== undefined) {
    query.limit = params.limit;
  }

  if (params.offset !== undefined) {
    query.offset = params.offset;
  }

  return query;
};
