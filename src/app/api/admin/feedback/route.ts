import { NextResponse } from "next/server";
import { and, desc, eq, gte, ilike, lte, sql } from "drizzle-orm";
import { hasAdminAccess } from "@/server/auth/admin";
import { getDatabase } from "@/server/database/client";
import { feedback, trips } from "@/server/database/schema";

const safeCsv = (value: unknown) => { const text = String(value ?? "").replace(/"/g, '""'); return `"${/^[=+\-@]/.test(text) ? `'${text}` : text}"`; };
export async function GET(request: Request) {
  if (!await hasAdminAccess()) return NextResponse.json({ error: "未授权" }, { status: 401 });
  const url = new URL(request.url); const page = Math.max(1, Number(url.searchParams.get("page")) || 1); const pageSize = 30;
  const rating = url.searchParams.get("rating"); const destination = url.searchParams.get("destination"); const from = url.searchParams.get("from"); const to = url.searchParams.get("to"); const kind = url.searchParams.get("kind"); const style = url.searchParams.get("style"); const companion = url.searchParams.get("companion"); const interest = url.searchParams.get("interest"); const tag = url.searchParams.get("tag");
  const conditions = [rating ? eq(feedback.rating, rating as "helpful" | "usable" | "not_helpful") : undefined, destination ? ilike(sql`${trips.inputJson}->'destination'->>'city'`, `%${destination}%`) : undefined, from ? gte(feedback.createdAt, new Date(`${from}T00:00:00Z`)) : undefined, to ? lte(feedback.createdAt, new Date(`${to}T23:59:59Z`)) : undefined].filter(Boolean);
  const where = conditions.length ? and(...conditions) : undefined; const db = getDatabase();
  const allRows = await db.select({ id: feedback.id, tripId: feedback.tripId, rating: feedback.rating, tags: feedback.issueTagsJson, comment: feedback.comment, createdAt: feedback.createdAt, tripCreatedAt: trips.createdAt, input: trips.inputJson }).from(feedback).innerJoin(trips, eq(feedback.tripId, trips.id)).where(where).orderBy(desc(feedback.createdAt));
  const parsed = allRows.map((row) => { const match = row.comment?.match(/^第(\d+)天反馈(?:｜([\s\S]*))?$/); return { ...row, kind: match ? "day" : "overall", dayNumber: match ? Number(match[1]) : null, destination: row.input.destination.city, style: row.input.travelStyle, interests: row.input.priorities, companion: row.input.companionType, hasCustomTime: Boolean(row.input.preferredWakeTime || row.input.preferredDepartureTime), comment: match ? match[2] || null : row.comment }; }).filter((row) => (!kind || kind === "all" || row.kind === kind) && (!style || row.style === style) && (!companion || row.companion === companion) && (!interest || row.interests.includes(interest as never)) && (!tag || row.tags.includes(tag)));
  const tagCounts = Object.entries(parsed.flatMap((row) => row.tags).reduce<Record<string,number>>((result,value) => ({ ...result, [value]: (result[value] || 0) + 1 }), {})).sort((a,b)=>b[1]-a[1]).slice(0,8);
  const stats = { total: parsed.length, helpful: parsed.filter((row) => row.rating === "helpful").length, usable: parsed.filter((row) => row.rating === "usable").length, notHelpful: parsed.filter((row) => row.rating === "not_helpful").length, tagCounts };
  if (url.searchParams.get("format") === "csv") { const lines = [["时间","类型","目的地","节奏","第几天","评分","问题标签","备注","攻略ID"].map(safeCsv).join(","), ...parsed.map((row) => [row.createdAt.toISOString(), row.kind, row.destination, row.style, row.dayNumber ?? "", row.rating, row.tags.join("|"), row.comment ?? "", row.tripId].map(safeCsv).join(","))]; return new Response(`\uFEFF${lines.join("\n")}`, { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": "attachment; filename=feedback.csv" } }); }
  return NextResponse.json({ stats, rows: parsed.slice((page - 1) * pageSize, page * pageSize), page, pages: Math.max(1, Math.ceil(parsed.length / pageSize)) });
}
