import { findVisitor } from "@/server/auth/visitor";
import { currentUser } from "@/server/auth/user";
import { getTrip, hasUndoRevision } from "@/server/database/trips";
import { apiError, HttpError } from "@/server/http";
import { verifyWebTripShareToken } from "@/server/sharing/web-trip-share";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const [trip, visitor, user] = await Promise.all([getTrip(id), findVisitor(), currentUser()]);
    const canEdit = visitor?.visitorId === trip.visitorId || Boolean(user && trip.userId === user.id);
    const shareToken = new URL(request.url).searchParams.get("share");
    const canReadShared = Boolean(shareToken && verifyWebTripShareToken(shareToken, id));
    if (!canEdit && !canReadShared) throw new HttpError(403, "没有权限查看这份旅行攻略", "TRIP_READ_FORBIDDEN");
    return Response.json({
      tripId: trip.id, status: trip.status, input: trip.input, plan: trip.plan, version: trip.version,
      canEdit, canUndo: canEdit ? await hasUndoRevision(trip.id) : false,
    });
  } catch (error) { return apiError(error); }
}
