// server/utils/db.ts
import { db } from "hub:db";
import { schema } from "hub:db";

export { sql, eq, and, or, ne, isNull, inArray } from "drizzle-orm";

// Export db as useDrizzle for backwards compatibility
export const useDrizzle = () => db;

// Export schema as tables
export const tables = schema;

// Export types
export type Board = typeof schema.BOARDS.$inferSelect;
