import { findVisitor, ensureVisitor } from "@/server/auth/visitor";
import { getTrip } from "@/server/database/trips";
import { createTravelPosterTask, listTripImageTasks } from "@/server/database/trip-images";
import { tripImageCreateSchema } from "@/schemas/trip-image";
import { apiError, HttpError, readJsonBody } from "@/server/http";
import { hashIdempotency } from "@/server/ai/guard";
import { assertAiRequestAllowed } from "@/server/ai/guard";
import { serverConfig } from "@/server/config";
import { currentUser } from "@/server/auth/user";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params; const [trip, visitor, user] = await Promise.all([getTrip(id), findVisitor(), currentUser()]);
    return Response.json(await listTripImageTasks(id, visitor?.visitorId ?? null, trip.visitorId, serverConfig.freeLifetimePremiumImageLimit, user?.id ?? null, trip.userId));
  } catch (error) { return apiError(error); }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const body = tripImageCreateSchema.safeParse(await readJsonBody(request));
    if (!body.success) throw new HttpError(400, "图片生成请求无效", "INVALID_IMAGE_REQUEST");
    const { id } = await params; const [visitor,user] = await Promise.all([ensureVisitor(),currentUser()]);
    if(!user) throw new HttpError(401,"登录后可生成旅行海报","LOGIN_REQUIRED");
    await assertAiRequestAllowed(request, visitor.visitorId, "travel_poster");
    const result = await createTravelPosterTask({ tripId: id, visitorId: visitor.visitorId, userId:user.id, aspectRatio: body.data.aspectRatio, idempotencyHash: hashIdempotency(body.data.idempotencyKey), lifetimeLimit: serverConfig.freeLifetimePremiumImageLimit });
    return Response.json(result, { status: result.reused ? 200 : 201 });
  } catch (error) { return apiError(error); }
}
