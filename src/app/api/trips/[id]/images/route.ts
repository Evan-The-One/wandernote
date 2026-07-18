import { findVisitor, ensureVisitor } from "@/server/auth/visitor";
import { getTrip } from "@/server/database/trips";
import { createTemplateImageTask, listTripImageTasks } from "@/server/database/trip-images";
import { tripImageCreateSchema } from "@/schemas/trip-image";
import { apiError, HttpError, readJsonBody } from "@/server/http";
import { hashIdempotency } from "@/server/ai/guard";
import { serverConfig } from "@/server/config";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params; const [trip, visitor] = await Promise.all([getTrip(id), findVisitor()]);
    return Response.json(await listTripImageTasks(id, visitor?.visitorId ?? null, trip.visitorId, serverConfig.freeLifetimePremiumImageLimit));
  } catch (error) { return apiError(error); }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const body = tripImageCreateSchema.safeParse(await readJsonBody(request));
    if (!body.success) throw new HttpError(400, "图片生成请求无效", "INVALID_IMAGE_REQUEST");
    const { id } = await params; const visitor = await ensureVisitor();
    const result = await createTemplateImageTask({ tripId: id, visitorId: visitor.visitorId, aspectRatio: body.data.aspectRatio, idempotencyHash: hashIdempotency(body.data.idempotencyKey), lifetimeLimit: serverConfig.freeLifetimePremiumImageLimit });
    return Response.json(result, { status: result.reused ? 200 : 201 });
  } catch (error) { return apiError(error); }
}
