import "server-only";
import { Pool, type QueryResultRow } from "pg";
import { env } from "./env";

const globalForPool = global as unknown as { __pgPool?: Pool };

export const pool =
  globalForPool.__pgPool ??
  new Pool({
    host: env.PG_HOST,
    port: env.PG_PORT,
    user: env.PG_USER,
    password: env.PG_PASSWORD,
    database: env.PG_DATABASE,
    max: env.DB_CONNECTION_LIMIT,
    ssl: env.PG_USE_SSL ? { rejectUnauthorized: false } : undefined,
  });

if (process.env.NODE_ENV !== "production") {
  globalForPool.__pgPool = pool;
}

// Generic query helper
export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: any[]
): Promise<T[]> {
  const res = await pool.query<T>(text, params);
  return res.rows;
}

// (optional) one-row helper
export async function queryOne<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: any[]
): Promise<T | null> {
  const res = await pool.query<T>(text, params);
  return res.rows[0] ?? null;
}
