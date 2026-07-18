import { feedbackSchema } from "@/schemas/beta";
import { ensureVisitor } from "@/server/auth/visitor";
import { getTrip, saveFeedback } from "@/server/database/trips";
import { apiError, HttpError, readJsonBody } from "@/server/http";
import { assertFeedbackLimit } from "@/server/security/rate-limit";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const body = feedbackSchema.safeParse(await readJsonBody(request));
    if (!body.success) throw new HttpError(400, body.error.issues[0]?.message || "反馈格式无效", "INVALID_FEEDBACK");
    const { id } = await params; await getTrip(id); const visitor = await ensureVisitor();
    await assertFeedbackLimit(visitor.visitorId);
    await saveFeedback(id, visitor.visitorId, body.data.rating, body.data.issueTags, body.data.comment);
    return Response.json({ saved: true }, { status: 201 });
  } catch (error) { return apiError(error); }
}
