import { feedbackSchema } from "@/schemas/beta";
import { ensureVisitor } from "@/server/auth/visitor";
import {currentUser} from "@/server/auth/user";
import {getDatabase} from "@/server/database/client";
import {tripImageTasks} from "@/server/database/schema";
import {and,eq} from "drizzle-orm";
import { getTrip, saveFeedback } from "@/server/database/trips";
import { apiError, HttpError, readJsonBody } from "@/server/http";
import { assertFeedbackLimit } from "@/server/security/rate-limit";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const body = feedbackSchema.safeParse(await readJsonBody(request));
    if (!body.success) throw new HttpError(400, body.error.issues[0]?.message || "反馈格式无效", "INVALID_FEEDBACK");
    const { id } = await params; const trip=await getTrip(id); const visitor = await ensureVisitor();const user=await currentUser();
    if(trip.visitorId!==visitor.visitorId&&(!user||trip.userId!==user.id))throw new HttpError(403,"只能反馈自己的行程","TRIP_OWNERSHIP_REQUIRED");
    if(body.data.posterTaskId){if(!user)throw new HttpError(403,"请先登录后反馈海报问题","POSTER_OWNERSHIP_REQUIRED");const[owned]=await getDatabase().select({id:tripImageTasks.id}).from(tripImageTasks).where(and(eq(tripImageTasks.id,body.data.posterTaskId),eq(tripImageTasks.tripId,id))).limit(1);if(!owned)throw new HttpError(403,"无法关联这张海报","POSTER_OWNERSHIP_REQUIRED");}
    await assertFeedbackLimit(visitor.visitorId);
    await saveFeedback(id, visitor.visitorId, body.data.rating, body.data.issueTags, body.data.comment,body.data.feedbackType,body.data.posterTaskId||null);
    return Response.json({ saved: true }, { status: 201 });
  } catch (error) { return apiError(error); }
}
