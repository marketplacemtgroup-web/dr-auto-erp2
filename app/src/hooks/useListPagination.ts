import { useEffect, useState } from "react";
import { DEFAULT_PAGE_SIZE, paginatedMeta, type PaginatedResponse } from "../lib/pagination";

export function useListPagination(deps: unknown[] = [], pageSize = DEFAULT_PAGE_SIZE) {
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset page when filters change
  }, deps);

  return { page, setPage, pageSize };
}

export function paginationFromData<T>(
  data: T[] | PaginatedResponse<T> | undefined,
  page: number,
  pageSize: number,
) {
  const meta = paginatedMeta(data);
  return {
    page: meta?.page ?? page,
    totalPages: meta?.totalPages ?? 1,
    total: meta?.total ?? (Array.isArray(data) ? data.length : 0),
    take: pageSize,
  };
}
