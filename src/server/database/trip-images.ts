import { and, count, desc, eq, sql } from "drizzle-orm";
import { getDatabase, withDatabaseTransaction, type Transaction } from "./client";
import { analyticsEvents, entitlementLedger, tripImageTasks, trips } from "./schema";
import { tripImageTemplateSpecSchema, type TripImageAspectRatio } from "@/schemas/trip-image";
import { tripPlanSchema } from "@/schemas/trip";
import { HttpError } from "@/server/http";
import { staticCityAtmosphere } from "@/server/images/provider";

export const PREMIUM_IMAGE_TEMPLATE_VERSION = "classic_timeline_v1";
const CREDIT_TYPE = "premium_trip_image";
let imageTablesInitialized = false;

export async function ensureTripImageTables() {
  if (imageTablesInitialized) return;
  const db = getDatabase();
  await db.execute(sql.raw(`CREATE TABLE IF NOT EXISTS trip_image_tasks (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), visitor_id uuid NOT NULL REFERENCES visitors(id) ON DELETE CASCADE, trip_id uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE, trip_version integer NOT NULL, image_type text NOT NULL, aspect_ratio text NOT NULL, template_version text NOT NULL, provider text NOT NULL, status text NOT NULL, idempotency_hash text NOT NULL, output_json jsonb, failure_code text, retry_count integer NOT NULL DEFAULT 0, duration_ms integer, estimated_cost_usd text NOT NULL DEFAULT '0', created_at timestamptz NOT NULL DEFAULT now(), completed_at timestamptz)`));
  await db.execute(sql.raw(`CREATE UNIQUE INDEX IF NOT EXISTS trip_image_tasks_idempotency_unique ON trip_image_tasks(visitor_id,idempotency_hash)`));
  await db.execute(sql.raw(`CREATE UNIQUE INDEX IF NOT EXISTS trip_image_tasks_cache_unique ON trip_image_tasks(trip_id,trip_version,image_type,aspect_ratio,template_version)`));
  await db.execute(sql.raw(`CREATE INDEX IF NOT EXISTS trip_image_tasks_trip_created_idx ON trip_image_tasks(trip_id,created_at)`));
  await db.execute(sql.raw(`CREATE TABLE IF NOT EXISTS entitlement_ledger (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), visitor_id uuid NOT NULL REFERENCES visitors(id) ON DELETE CASCADE, credit_type text NOT NULL, direction text NOT NULL, amount integer NOT NULL, source text NOT NULL, business_key text NOT NULL UNIQUE, task_id uuid, created_at timestamptz NOT NULL DEFAULT now())`));
  await db.execute(sql.raw(`CREATE INDEX IF NOT EXISTS entitlement_ledger_visitor_type_idx ON entitlement_ledger(visitor_id,credit_type,created_at)`));
  imageTablesInitialized = true;
}

function compact(value: string, max: number) { return value.replace(/\s+/g, " ").trim().slice(0, max); }
function createTemplateSpec(tripId: string, tripVersion: number, aspectRatio: TripImageAspectRatio, rawPlan: unknown) {
  const plan = tripPlanSchema.parse(rawPlan);
  return tripImageTemplateSpecSchema.parse({
    template: "classic_timeline", templateVersion: PREMIUM_IMAGE_TEMPLATE_VERSION, tripId, tripVersion, aspectRatio,
    title: compact(plan.title, 120), destination: plan.destination.city, daysCount: plan.days.length, theme: compact(plan.summary, 180),
    stayArea: compact(plan.strategy.recommendedStayArea, 100), transportAdvice: compact(plan.strategy.transportAdvice, 180),
    reminder: "营业时间、票价和交通请以出发当天实际情况为准。", heroImage: staticCityAtmosphere(plan.destination.city),
    days: plan.days.map((day) => ({ dayNumber: day.dayNumber, date: day.date, title: compact(day.title, 100), theme: compact(day.theme, 100), tips: day.dayTips.slice(0, 3).map((tip) => compact(tip, 140)), activities: day.activities.map((activity) => ({ time: activity.startTime, name: compact(activity.name, 80), area: compact(activity.area, 60), durationMinutes: activity.durationMinutes, reason: compact(activity.reason, 120), transport: activity.transportToNext ? { method: activity.transportToNext.method, durationMinutes: activity.transportToNext.durationMinutes } : null })) })),
  });
}

function serializeTask(row: typeof tripImageTasks.$inferSelect) {
  const output = row.outputJson ? tripImageTemplateSpecSchema.safeParse(row.outputJson) : null;
  return { id: row.id, tripId: row.tripId, tripVersion: row.tripVersion, imageType: row.imageType, aspectRatio: row.aspectRatio, templateVersion: row.templateVersion, provider: row.provider, status: row.status, output: output?.success ? output.data : null, failureCode: row.failureCode, createdAt: row.createdAt.toISOString(), completedAt: row.completedAt?.toISOString() ?? null };
}

export async function createTemplateImageTask(args: { tripId: string; visitorId: string; aspectRatio: TripImageAspectRatio; idempotencyHash: string; lifetimeLimit: number }) {
  await ensureTripImageTables();
  return withDatabaseTransaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${args.visitorId}))`);
    const [trip] = await tx.select().from(trips).where(eq(trips.id, args.tripId)).limit(1);
    if (!trip) throw new HttpError(404, "没有找到这份旅行攻略", "TRIP_NOT_FOUND");
    if (trip.visitorId !== args.visitorId) throw new HttpError(403, "分享访客只能查看，不能生成精美图片", "EDIT_FORBIDDEN");
    if (trip.status !== "completed" || !trip.currentPlanJson) throw new HttpError(409, "攻略完成后才能生成图片", "TRIP_NOT_READY");
    const [byIdempotency] = await tx.select().from(tripImageTasks).where(and(eq(tripImageTasks.visitorId, args.visitorId), eq(tripImageTasks.idempotencyHash, args.idempotencyHash))).limit(1);
    if (byIdempotency) return { task: serializeTask(byIdempotency), reused: true, remaining: await remainingCredits(tx, args.visitorId, args.lifetimeLimit) };
    const [cached] = await tx.select().from(tripImageTasks).where(and(eq(tripImageTasks.tripId, args.tripId), eq(tripImageTasks.tripVersion, trip.version), eq(tripImageTasks.imageType, "premium_trip"), eq(tripImageTasks.aspectRatio, args.aspectRatio), eq(tripImageTasks.templateVersion, PREMIUM_IMAGE_TEMPLATE_VERSION))).limit(1);
    if (cached) return { task: serializeTask(cached), reused: true, remaining: await remainingCredits(tx, args.visitorId, args.lifetimeLimit) };
    const grantKey = `free-grant:${CREDIT_TYPE}:${args.visitorId}`;
    await tx.insert(entitlementLedger).values({ visitorId: args.visitorId, creditType: CREDIT_TYPE, direction: "grant", amount: args.lifetimeLimit, source: "free_grant", businessKey: grantKey }).onConflictDoNothing({ target: entitlementLedger.businessKey });
    const creditKey = `consume:${CREDIT_TYPE}:${args.visitorId}:${args.tripId}:${trip.version}:${PREMIUM_IMAGE_TEMPLATE_VERSION}`;
    const [existingConsumption] = await tx.select({ id: entitlementLedger.id }).from(entitlementLedger).where(eq(entitlementLedger.businessKey, creditKey)).limit(1);
    if (!existingConsumption) {
      const remaining = await remainingCredits(tx, args.visitorId, args.lifetimeLimit);
      if (remaining < 1) throw new HttpError(429, "免费图片机会已使用，更多图片生成方式正在准备中", "IMAGE_LIMIT_REACHED");
      await tx.insert(entitlementLedger).values({ visitorId: args.visitorId, creditType: CREDIT_TYPE, direction: "consume", amount: 1, source: "template_generation", businessKey: creditKey });
    }
    const started = performance.now(); const output = createTemplateSpec(args.tripId, trip.version, args.aspectRatio, trip.currentPlanJson);
    const [task] = await tx.insert(tripImageTasks).values({ visitorId: args.visitorId, tripId: args.tripId, tripVersion: trip.version, imageType: "premium_trip", aspectRatio: args.aspectRatio, templateVersion: PREMIUM_IMAGE_TEMPLATE_VERSION, provider: "template", status: "succeeded", idempotencyHash: args.idempotencyHash, outputJson: output, durationMs: Math.round(performance.now() - started), completedAt: new Date() }).returning();
    await tx.update(entitlementLedger).set({ taskId: task.id }).where(eq(entitlementLedger.businessKey, creditKey));
    await tx.insert(analyticsEvents).values({ visitorId: args.visitorId, tripId: args.tripId, eventName: "premium_image_succeeded", status: "completed", durationMs: task.durationMs, metadata: { aspectRatio: args.aspectRatio, provider: "template", imageType: "premium_trip", sourceType: "static", estimatedCostUsd: 0, templateVersion: PREMIUM_IMAGE_TEMPLATE_VERSION } });
    return { task: serializeTask(task), reused: false, remaining: await remainingCredits(tx, args.visitorId, args.lifetimeLimit) };
  });
}

type CreditReader = Pick<Transaction, "select">;
async function remainingCredits(tx: CreditReader, visitorId: string, fallbackGrant: number) {
  const rows = await tx.select({ direction: entitlementLedger.direction, amount: entitlementLedger.amount }).from(entitlementLedger).where(and(eq(entitlementLedger.visitorId, visitorId), eq(entitlementLedger.creditType, CREDIT_TYPE)));
  if (!rows.length) return fallbackGrant;
  return Math.max(0, rows.reduce((sum, row) => sum + (row.direction === "grant" || row.direction === "refund" ? row.amount : -row.amount), 0));
}

export async function listTripImageTasks(tripId: string, visitorId: string | null, ownerId: string, lifetimeLimit: number) {
  await ensureTripImageTables(); const db = getDatabase();
  const rows = await db.select().from(tripImageTasks).where(eq(tripImageTasks.tripId, tripId)).orderBy(desc(tripImageTasks.createdAt)).limit(30);
  const canGenerate = visitorId === ownerId;
  return { tasks: rows.map(serializeTask), canGenerate, remaining: canGenerate && visitorId ? await remainingCredits(db, visitorId, lifetimeLimit) : 0 };
}

export async function getImageAdminMetrics(since: Date) {
  await ensureTripImageTables(); const db = getDatabase();
  const rows = await db.select().from(tripImageTasks).where(sql`${tripImageTasks.createdAt} >= ${since}`);
  const succeeded = rows.filter((row) => row.status === "succeeded");
  const ratios = Object.entries(rows.reduce<Record<string, number>>((result, row) => ({ ...result, [row.aspectRatio]: (result[row.aspectRatio] || 0) + 1 }), {}));
  const [credits] = await db.select({ value: count() }).from(entitlementLedger).where(and(eq(entitlementLedger.creditType, CREDIT_TYPE), eq(entitlementLedger.direction, "consume"), sql`${entitlementLedger.createdAt} >= ${since}`));
  return { total: rows.length, succeeded: succeeded.length, failed: rows.filter((row) => row.status === "failed").length, averageDurationMs: succeeded.length ? Math.round(succeeded.reduce((sum, row) => sum + (row.durationMs || 0), 0) / succeeded.length) : 0, totalCostUsd: rows.reduce((sum, row) => sum + Number(row.estimatedCostUsd || 0), 0), freeCreditsUsed: credits.value, ratios };
}
