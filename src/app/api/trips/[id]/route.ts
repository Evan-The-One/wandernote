import { findVisitor } from "@/server/auth/visitor";
import { currentUser } from "@/server/auth/user";
import { getTrip, hasUndoRevision } from "@/server/database/trips";
import { apiError } from "@/server/http";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const [trip, visitor, user] = await Promise.all([getTrip(id), findVisitor(), currentUser()]);
    const canEdit = visitor?.visitorId === trip.visitorId || Boolean(user && trip.userId === user.id);
    return Response.json({
      tripId: trip.id, status: trip.status, input: trip.input, plan: trip.plan, version: trip.version,
      canEdit, canUndo: canEdit ? await hasUndoRevision(trip.id) : false,
    });
  } catch (error) { return apiError(error); }
}
