import { sql } from "drizzle-orm";
import { getDatabase } from "@/server/database/client";
import { userAuthConfigured } from "@/server/auth/user";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  let databaseReachable = false;
  try { await getDatabase().execute(sql`select 1`); databaseReachable = true; }
  catch { databaseReachable = false; }
  const generationConfigured = Boolean(process.env.OPENAI_API_KEY && process.env.OPENAI_MODEL && process.env.AI_GENERATION_ENABLED !== "false");
  const healthy = databaseReachable && generationConfigured;
  return Response.json({ status: healthy ? "ok" : "degraded", databaseReachable, generationConfigured, authConfigured:userAuthConfigured(), deploymentCommit:process.env.VERCEL_GIT_COMMIT_SHA?.slice(0,7)||"local", timestamp:new Date().toISOString() }, { status:healthy?200:503, headers:{"cache-control":"no-store"} });
}
