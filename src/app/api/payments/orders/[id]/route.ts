import { currentUser } from "@/server/auth/user";
import { getOwnedOrder } from "@/server/payments/orders";
import { apiError, HttpError } from "@/server/http";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await currentUser();
    if (!user) throw new HttpError(401, "请先登录", "LOGIN_REQUIRED");
    const order = await getOwnedOrder((await params).id, user.id);
    return Response.json({ id: order.id, status: order.status, points: order.points, amountCents: order.amountCents, currency: order.currency, createdAt: order.createdAt });
  } catch (error) { return apiError(error); }
}
