import { undoDaySchema } from "@/schemas/beta";
import { ensureVisitor } from "@/server/auth/visitor";
import { getTrip, undoLatestRevision } from "@/server/database/trips";
import { apiError, HttpError, readJsonBody } from "@/server/http";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const body = undoDaySchema.safeParse(await readJsonBody(request));
    if (!body.success) throw new HttpError(400, "撤销请求无效", "INVALID_UNDO");
    const { id } = await params; const visitor = await ensureVisitor(); const trip = await getTrip(id);
    if (trip.visitorId !== visitor.visitorId) throw new HttpError(403, "你不能撤销别人的攻略", "EDIT_FORBIDDEN");
    return Response.json(await undoLatestRevision(id, visitor.visitorId, body.data.version));
  } catch (error) { return apiError(error); }
}
