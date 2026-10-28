export type PageParams = {
  page: number;
  pageSize: number;
};

export type Paginated<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
};

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

/** Inclusive `from`/`to` row offsets for range-based pagination. */
export function pageRange({ page, pageSize }: PageParams): { from: number; to: number } {
  const size = Math.min(Math.max(pageSize, 1), MAX_PAGE_SIZE);
  const from = (Math.max(page, 1) - 1) * size;
  return { from, to: from + size - 1 };
}

export function toPaginated<T>(items: T[], total: number, params: PageParams): Paginated<T> {
  return {
    items,
    total,
    page: params.page,
    pageSize: params.pageSize,
    pageCount: Math.max(1, Math.ceil(total / params.pageSize)),
  };
}
