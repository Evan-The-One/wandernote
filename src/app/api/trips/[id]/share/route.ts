import { findVisitor } from "@/server/auth/visitor";
import { currentUser } from "@/server/auth/user";
import { getTrip } from "@/server/database/trips";
import { apiError, assertTrustedMutation, HttpError } from "@/server/http";
import { createWebTripShareToken } from "@/server/sharing/web-trip-share";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    assertTrustedMutation(request);
    const { id } = await params;
    const [trip, visitor, user] = await Promise.all([getTrip(id), findVisitor(), currentUser()]);
    const isOwner = visitor?.visitorId === trip.visitorId || Boolean(user && trip.userId === user.id);
    if (!isOwner) throw new HttpError(403, "没有权限分享这份旅行攻略", "TRIP_SHARE_FORBIDDEN");
    const token = createWebTripShareToken(id);
    return Response.json({ url: `${new URL(request.url).origin}/trip/${encodeURIComponent(id)}?share=${encodeURIComponent(token)}` }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    return apiError(error);
  }
}
