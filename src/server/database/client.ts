import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { drizzle as drizzleTransactional } from "drizzle-orm/neon-serverless";
import * as schema from "./schema";

export class DatabaseConfigurationError extends Error {}

export function getDatabase() {
  return drizzle(getDatabaseUrl(), { schema });
}

type TransactionalDatabase = ReturnType<typeof createTransactionalDatabase>;
type Transaction = Parameters<Parameters<TransactionalDatabase["transaction"]>[0]>[0];

function createTransactionalDatabase(pool: Pool) {
  return drizzleTransactional(pool, { schema });
}

export async function withDatabaseTransaction<T>(callback: (transaction: Transaction) => Promise<T>) {
  const pool = new Pool({ connectionString: getDatabaseUrl() });
  const database = createTransactionalDatabase(pool);
  try {
    return await database.transaction(callback);
  } finally {
    await pool.end();
  }
}

function getDatabaseUrl() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new DatabaseConfigurationError("数据库尚未配置，请设置 DATABASE_URL 后重试");
  return url;
}
