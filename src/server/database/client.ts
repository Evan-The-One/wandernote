import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

export class DatabaseConfigurationError extends Error {}

export function getDatabase() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new DatabaseConfigurationError("数据库尚未配置，请设置 DATABASE_URL 后重试");
  return drizzle(url, { schema });
}
