import { findVisitor } from "@/server/auth/visitor";
import { getTrip, hasUndoRevision } from "@/server/database/trips";
import { apiError } from "@/server/http";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const [trip, visitor] = await Promise.all([getTrip(id), findVisitor()]);
    const canEdit = visitor?.visitorId === trip.visitorId;
    return Response.json({
      tripId: trip.id, status: trip.status, input: trip.input, plan: trip.plan, version: trip.version,
      canEdit, canUndo: canEdit ? await hasUndoRevision(trip.id) : false,
    });
  } catch (error) { return apiError(error); }
}
