import { findVisitor } from "@/server/auth/visitor";
import { getRecentTrip } from "@/server/database/trips";
import { apiError } from "@/server/http";

export async function GET() {
  try {
    const visitor = await findVisitor();
    return Response.json({ tripId: visitor ? await getRecentTrip(visitor.visitorId) : null });
  } catch (error) { return apiError(error); }
}
