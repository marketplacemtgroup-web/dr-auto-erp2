export const DEFAULT_PAGE_SIZE = 50;

export type Paginated<T> = {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export type PaginatedResponse<T> = Paginated<T>;

export function paginatedMeta<T>(data: T[] | PaginatedResponse<T> | undefined) {
  if (!data || Array.isArray(data)) return null;
  return data.pagination;
}

export function unwrapPaginated<T>(body: T[] | Paginated<T>): T[] {
  if (Array.isArray(body)) return body;
  return body.data ?? [];
}

export function paginationFrom<T>(body: T[] | Paginated<T>) {
  if (Array.isArray(body)) {
    return {
      data: body,
      pagination: {
        page: 1,
        limit: body.length,
        total: body.length,
        totalPages: body.length > 0 ? 1 : 0,
      },
    } satisfies Paginated<T>;
  }
  return body;
}
