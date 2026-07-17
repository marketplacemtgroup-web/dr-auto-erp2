export const DEFAULT_LIST_LIMIT = 50;
export const MAX_LIST_LIMIT = 200;

export type ListQueryInput = {
  page?: string | number;
  limit?: string | number;
};

export type ParsedListQuery = {
  page: number;
  limit: number;
  skip: number;
};

export type PaginationMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type PaginatedResult<T> = {
  data: T[];
  pagination: PaginationMeta;
};

export function parseListQuery(query: ListQueryInput = {}): ParsedListQuery {
  const rawPage = Number(query.page ?? 1);
  const rawLimit = Number(query.limit ?? DEFAULT_LIST_LIMIT);
  const page = Number.isFinite(rawPage) && rawPage > 0 ? Math.floor(rawPage) : 1;
  const limit =
    Number.isFinite(rawLimit) && rawLimit > 0
      ? Math.min(Math.floor(rawLimit), MAX_LIST_LIMIT)
      : DEFAULT_LIST_LIMIT;
  return { page, limit, skip: (page - 1) * limit };
}

export function paginatedResponse<T>(
  data: T[],
  total: number,
  page: number,
  limit: number,
): PaginatedResult<T> {
  const totalPages = total === 0 ? 0 : Math.ceil(total / limit);
  return {
    data,
    pagination: { page, limit, total, totalPages },
  };
}

export function countRecords<T>(rows: T[] | PaginatedResult<T>): number {
  if (Array.isArray(rows)) return rows.length;
  return rows.pagination.total;
}
