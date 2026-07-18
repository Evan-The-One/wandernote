import { and, count, desc, eq, sql } from "drizzle-orm";
import { getDatabase, withDatabaseTransaction, type Transaction } from "./client";
import { analyticsEvents, entitlementLedger, tripImageTasks, trips } from "./schema";
import { tripImageOutputSchema, tripImageTemplateSpecSchema, travelPosterSpecSchema, type TripImageAspectRatio } from "@/schemas/trip-image";
import { tripPlanSchema } from "@/schemas/trip";
import { HttpError } from "@/server/http";
import { createOpenAIImageProvider, staticCityAtmosphere } from "@/server/images/provider";

export const PREMIUM_IMAGE_TEMPLATE_VERSION = "classic_timeline_v1";
export const TRAVEL_POSTER_VERSION = "travel_poster_v1";
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
  const output = row.outputJson ? tripImageOutputSchema.safeParse(row.outputJson) : null;
  return { id: row.id, tripId: row.tripId, tripVersion: row.tripVersion, imageType: row.imageType, aspectRatio: row.aspectRatio, templateVersion: row.templateVersion, provider: row.provider, status: row.status, output: output?.success ? output.data : null, failureCode: row.failureCode, createdAt: row.createdAt.toISOString(), completedAt: row.completedAt?.toISOString() ?? null };
}

function posterDays(plan: ReturnType<typeof tripPlanSchema.parse>) {
  return plan.days.map((day) => ({ dayNumber: day.dayNumber, title: compact(day.title || day.theme, 48), city: compact(day.activities.find((activity) => activity.area)?.area || plan.destination.city, 32), activities: day.activities.filter((activity) => !["transport", "rest", "hotel"].includes(activity.type)).slice(0, 5).map((activity) => ({ time: activity.startTime, name: compact(activity.name, 48), note: compact(activity.reason, 54) })) }));
}

function splitPosterPages(days: ReturnType<typeof posterDays>) {
  if (days.length <= 2) return [{ kind: "days" as const, days }];
  const pages: Array<{ kind: "cover" | "days"; days: typeof days }> = [{ kind: "cover", days: [] }];
  for (let index = 0; index < days.length; index += 2) pages.push({ kind: "days", days: days.slice(index, index + 2) });
  return pages;
}

function posterPrompt(destination: string, title: string, page: { kind: "cover" | "days"; days: ReturnType<typeof posterDays> }, pageNumber: number, total: number) {
  const locations = page.days.flatMap((day) => day.activities.map((activity) => activity.name)).slice(0, 6).join("、");
  return `Create a premium portrait travel magazine poster BACKGROUND for ${destination}, page ${pageNumber} of ${total}. ${page.kind === "cover" ? `Cover mood for: ${title}` : `Visual scenes inspired by these real places: ${locations}`}.
Style: refined editorial travel magazine, authentic Chinese travel atmosphere, warm white and pale mint green base, deep green details, tiny warm-yellow accents, elegant photo collage with 2-3 realistic destination scenes, restrained scrapbook feeling, generous whitespace, sophisticated and calm, suitable for social sharing.
Composition: reserve clean translucent light panels and generous blank areas for later Chinese typography overlay; keep important architecture and faces away from text zones; add a subtle dotted route motif without map claims.
STRICT: generate NO words, NO letters, NO numbers, NO logos, NO signs, NO watermarks, NO UI, NO dense text. Do not invent an iconic landmark from another city. Not childish, not cartoon, not watercolor, not cyberpunk, not neon, not a cheap tour advertisement.`;
}

export async function createTravelPosterTask(args: { tripId: string; visitorId: string; aspectRatio: TripImageAspectRatio; idempotencyHash: string; lifetimeLimit: number }) {
  await ensureTripImageTables();
  const db = getDatabase();
  const prepared = await withDatabaseTransaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${args.visitorId}))`);
    const [trip] = await tx.select().from(trips).where(eq(trips.id, args.tripId)).limit(1);
    if (!trip) throw new HttpError(404, "没有找到这份旅行攻略", "TRIP_NOT_FOUND");
    if (trip.visitorId !== args.visitorId) throw new HttpError(403, "分享访客只能查看，不能生成旅行海报", "EDIT_FORBIDDEN");
    if (trip.status !== "completed" || !trip.currentPlanJson) throw new HttpError(409, "攻略完成后才能生成海报", "TRIP_NOT_READY");
    const [same] = await tx.select().from(tripImageTasks).where(and(eq(tripImageTasks.visitorId, args.visitorId), eq(tripImageTasks.idempotencyHash, args.idempotencyHash))).limit(1);
    if (same) return { existing: same, trip: null };
    const [cached] = await tx.select().from(tripImageTasks).where(and(eq(tripImageTasks.tripId, args.tripId), eq(tripImageTasks.tripVersion, trip.version), eq(tripImageTasks.imageType, "travel_poster"), eq(tripImageTasks.aspectRatio, args.aspectRatio), eq(tripImageTasks.templateVersion, TRAVEL_POSTER_VERSION),sql`${tripImageTasks.status} in ('running','succeeded')`)).limit(1);
    if (cached) return { existing: cached, trip: null };
    const creditType = "travel_poster";
    await tx.insert(entitlementLedger).values({ visitorId: args.visitorId, creditType, direction: "grant", amount: args.lifetimeLimit, source: "free_grant", businessKey: `free-grant:${creditType}:${args.visitorId}` }).onConflictDoNothing({ target: entitlementLedger.businessKey });
    const remaining = await remainingCreditsForType(tx, args.visitorId, creditType, args.lifetimeLimit);
    if (remaining < 1) throw new HttpError(429, "免费海报机会已使用，更多生成方式正在准备中", "IMAGE_LIMIT_REACHED");
    const creditKey = `consume:${creditType}:${args.visitorId}:${args.tripId}:${trip.version}:${TRAVEL_POSTER_VERSION}`;
    const [failed] = await tx.select().from(tripImageTasks).where(and(eq(tripImageTasks.tripId,args.tripId),eq(tripImageTasks.tripVersion,trip.version),eq(tripImageTasks.imageType,"travel_poster"),eq(tripImageTasks.aspectRatio,args.aspectRatio),eq(tripImageTasks.templateVersion,TRAVEL_POSTER_VERSION),eq(tripImageTasks.status,"failed"))).limit(1);
    const [task] = failed ? await tx.update(tripImageTasks).set({ status:"running",idempotencyHash:args.idempotencyHash,failureCode:null,outputJson:null,completedAt:null }).where(eq(tripImageTasks.id,failed.id)).returning() : await tx.insert(tripImageTasks).values({ visitorId: args.visitorId, tripId: args.tripId, tripVersion: trip.version, imageType: "travel_poster", aspectRatio: args.aspectRatio, templateVersion: TRAVEL_POSTER_VERSION, provider: "openai", status: "running", idempotencyHash: args.idempotencyHash }).returning();
    await tx.insert(entitlementLedger).values({ visitorId: args.visitorId, creditType, direction: "consume", amount: 1, source: "openai_poster_generation", businessKey: `${creditKey}:${task.id}:${Date.now()}`, taskId: task.id });
    return { existing: null, trip, task, creditKey };
  });
  if (prepared.existing) return { task: serializeTask(prepared.existing), reused: true, remaining: await remainingCreditsForType(db, args.visitorId, "travel_poster", args.lifetimeLimit) };
  if (!prepared.trip || !prepared.task || !prepared.creditKey) throw new HttpError(500, "海报任务创建失败", "IMAGE_TASK_ERROR");
  const started = performance.now();
  try {
    const plan = tripPlanSchema.parse(prepared.trip.currentPlanJson); const days = posterDays(plan); const pagePlans = splitPosterPages(days); const provider = createOpenAIImageProvider();
    if (!provider.enabled) throw Object.assign(new Error("图片服务尚未配置"), { code: "IMAGE_PROVIDER_DISABLED" });
    const generated = await Promise.all(pagePlans.map((page, index) => provider.generatePosterBackground({ prompt: posterPrompt(plan.destination.city, plan.title, page, index + 1, pagePlans.length), size: "1024x1536" })));
    const estimatedCostUsd = generated.reduce((sum, image) => sum + image.estimatedCostUsd, 0);
    const output = travelPosterSpecSchema.parse({ kind: "travel_poster", version: TRAVEL_POSTER_VERSION, tripId: args.tripId, tripVersion: prepared.trip.version, aspectRatio: args.aspectRatio, title: compact(plan.title, 70), subtitle: compact(plan.summary, 90), destination: plan.destination.city, daysCount: days.length, stayArea: compact(plan.strategy.recommendedStayArea, 80), reminder: "营业时间、票价和交通请以出发当天实际情况为准。", model: generated[0]!.model, quality: process.env.OPENAI_IMAGE_QUALITY === "low" || process.env.OPENAI_IMAGE_QUALITY === "high" ? process.env.OPENAI_IMAGE_QUALITY : "medium", estimatedCostUsd, pages: pagePlans.map((page, index) => ({ pageNumber: index + 1, dayRange: page.days.length ? `DAY ${page.days[0]!.dayNumber}${page.days.length > 1 ? `–${page.days.at(-1)!.dayNumber}` : ""}` : "旅行总览", backgroundDataUrl: generated[index]!.dataUrl, days: page.days, kind: page.kind })) });
    const durationMs = Math.round(performance.now() - started);
    const [saved] = await db.update(tripImageTasks).set({ status: "succeeded", outputJson: output, durationMs, estimatedCostUsd: String(estimatedCostUsd), completedAt: new Date() }).where(eq(tripImageTasks.id, prepared.task.id)).returning();
    await db.insert(analyticsEvents).values({ visitorId: args.visitorId, tripId: args.tripId, eventName: "travel_poster_succeeded", status: "completed", durationMs, metadata: { provider: "openai", model: output.model, pages: output.pages.length, estimatedCostUsd } });
    await db.insert(analyticsEvents).values({ visitorId: args.visitorId, tripId: args.tripId, eventName: "ai_usage", status: "completed", durationMs, metadata: { requestType: "travel_poster", model: output.model, inputTokens: 0, outputTokens: 0, cachedInputTokens: 0, reasoningTokens: 0, estimatedCostUsd, actualCostUsd: null, repairAttempt: false } });
    return { task: serializeTask(saved), reused: false, remaining: await remainingCreditsForType(db, args.visitorId, "travel_poster", args.lifetimeLimit) };
  } catch (error) {
    const code = typeof error === "object" && error && "code" in error ? String(error.code) : "IMAGE_PROVIDER_ERROR";
    await db.update(tripImageTasks).set({ status: "failed", failureCode: code, durationMs: Math.round(performance.now() - started), completedAt: new Date() }).where(eq(tripImageTasks.id, prepared.task.id));
    await db.insert(entitlementLedger).values({ visitorId: args.visitorId, creditType: "travel_poster", direction: "refund", amount: 1, source: "generation_failed", businessKey: `refund:travel_poster:${prepared.task.id}`, taskId: prepared.task.id }).onConflictDoNothing({ target: entitlementLedger.businessKey });
    throw new HttpError(502, "暂时没能生成这张海报，免费机会不会被扣除，请稍后再试。", code);
  }
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

async function remainingCreditsForType(tx: CreditReader, visitorId: string, creditType: string, fallbackGrant: number) {
  const rows = await tx.select({ direction: entitlementLedger.direction, amount: entitlementLedger.amount }).from(entitlementLedger).where(and(eq(entitlementLedger.visitorId, visitorId), eq(entitlementLedger.creditType, creditType)));
  if (!rows.length) return fallbackGrant;
  return Math.max(0, rows.reduce((sum, row) => sum + (row.direction === "grant" || row.direction === "refund" ? row.amount : -row.amount), 0));
}

export async function listTripImageTasks(tripId: string, visitorId: string | null, ownerId: string, lifetimeLimit: number) {
  await ensureTripImageTables(); const db = getDatabase();
  const rows = await db.select().from(tripImageTasks).where(eq(tripImageTasks.tripId, tripId)).orderBy(desc(tripImageTasks.createdAt)).limit(30);
  const canGenerate = visitorId === ownerId;
  return { tasks: rows.map(serializeTask), canGenerate, remaining: canGenerate && visitorId ? await remainingCreditsForType(db, visitorId, "travel_poster", lifetimeLimit) : 0 };
}

export async function getImageAdminMetrics(since: Date) {
  await ensureTripImageTables(); const db = getDatabase();
  const rows = await db.select().from(tripImageTasks).where(and(sql`${tripImageTasks.createdAt} >= ${since}`,eq(tripImageTasks.imageType,"travel_poster")));
  const succeeded = rows.filter((row) => row.status === "succeeded");
  const ratios = Object.entries(rows.reduce<Record<string, number>>((result, row) => ({ ...result, [row.aspectRatio]: (result[row.aspectRatio] || 0) + 1 }), {}));
  const [credits] = await db.select({ value: count() }).from(entitlementLedger).where(and(eq(entitlementLedger.creditType, "travel_poster"), eq(entitlementLedger.direction, "consume"), sql`${entitlementLedger.createdAt} >= ${since}`));
  return { total: rows.length, succeeded: succeeded.length, failed: rows.filter((row) => row.status === "failed").length, averageDurationMs: succeeded.length ? Math.round(succeeded.reduce((sum, row) => sum + (row.durationMs || 0), 0) / succeeded.length) : 0, totalCostUsd: rows.reduce((sum, row) => sum + Number(row.estimatedCostUsd || 0), 0), freeCreditsUsed: credits.value, ratios };
}
