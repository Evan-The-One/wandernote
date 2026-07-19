import { undoDaySchema } from "@/schemas/beta";
import { ensureVisitor } from "@/server/auth/visitor";
import { currentUser } from "@/server/auth/user";
import { getTrip, undoLatestRevision } from "@/server/database/trips";
import { apiError, HttpError, readJsonBody } from "@/server/http";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const body = undoDaySchema.safeParse(await readJsonBody(request));
    if (!body.success) throw new HttpError(400, "撤销请求无效", "INVALID_UNDO");
    const { id } = await params; const [visitor, user] = await Promise.all([ensureVisitor(), currentUser()]); const trip = await getTrip(id);
    if (trip.visitorId !== visitor.visitorId && (!user || trip.userId !== user.id)) throw new HttpError(403, "你不能撤销别人的攻略", "EDIT_FORBIDDEN");
    return Response.json(await undoLatestRevision(id, trip.visitorId, body.data.version));
  } catch (error) { return apiError(error); }
}
