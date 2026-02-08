// ===========================================
// Query Helpers (Filtering & Sorting)
// ===========================================

import { asc, desc, eq, like, gte, lte, and, type SQL, type Column } from 'drizzle-orm';

/**
 * Build a Drizzle orderBy expression from validated sort params.
 * Validates sortBy against an allow-list to prevent column injection.
 */
export function buildOrderBy(
  columnMap: Record<string, Column>,
  sortBy: string | undefined,
  sortOrder: 'asc' | 'desc',
  defaultColumn: string
): SQL {
  const column = (sortBy && columnMap[sortBy]) ? columnMap[sortBy] : columnMap[defaultColumn];
  if (!column) {
    throw new Error(`Invalid default sort column: ${defaultColumn}`);
  }
  return sortOrder === 'asc' ? asc(column) : desc(column);
}

/**
 * Operator types for filter conditions.
 */
type FilterOperator = 'eq' | 'like' | 'gte' | 'lte';

interface FilterDef {
  column: Column;
  operator: FilterOperator;
}

/**
 * Build combined WHERE conditions from a filter map.
 * Only includes conditions for keys present in the filters object
 * with non-undefined values.
 */
export function buildWhereConditions(
  filters: Record<string, unknown>,
  columnMap: Record<string, FilterDef>
): SQL | undefined {
  const conditions: SQL[] = [];

  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined || value === null) continue;
    const def = columnMap[key];
    if (!def) continue;

    switch (def.operator) {
      case 'eq':
        conditions.push(eq(def.column, value as string | number | boolean));
        break;
      case 'like':
        conditions.push(like(def.column, `%${value as string}%`));
        break;
      case 'gte':
        conditions.push(gte(def.column, value as string | number));
        break;
      case 'lte':
        conditions.push(lte(def.column, value as string | number));
        break;
    }
  }

  return conditions.length > 0 ? and(...conditions) : undefined;
}
