import { desc, eq } from "drizzle-orm";
import { currentUser } from "@/server/auth/user";
import { getDatabase } from "@/server/database/client";
import { paymentOrders, trips } from "@/server/database/schema";
import { getPointSummary } from "@/server/commerce/points";
import { apiError, HttpError } from "@/server/http";

export async function GET(){try{const user=await currentUser();if(!user)throw new HttpError(401,"请先登录","LOGIN_REQUIRED");const db=getDatabase();const [points,tripRows,orders]=await Promise.all([getPointSummary(user.id),db.select({id:trips.id,status:trips.status,version:trips.version,input:trips.inputJson,updatedAt:trips.updatedAt}).from(trips).where(eq(trips.userId,user.id)).orderBy(desc(trips.updatedAt)).limit(50),db.select().from(paymentOrders).where(eq(paymentOrders.userId,user.id)).orderBy(desc(paymentOrders.createdAt)).limit(30)]);return Response.json({user,points,trips:tripRows,orders});}catch(error){return apiError(error);}}
