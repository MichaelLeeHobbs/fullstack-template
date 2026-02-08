// ===========================================
// Pagination Helpers
// ===========================================

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Convert page/limit to offset/limit for SQL queries.
 */
export function paginationToOffset(page: number, limit: number): { offset: number; limit: number } {
  return { offset: (page - 1) * limit, limit };
}

/**
 * Build a standardized paginated result shape.
 */
export function buildPaginationResult<T>(
  data: T[],
  total: number,
  page: number,
  limit: number
): PaginatedResult<T> {
  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}
