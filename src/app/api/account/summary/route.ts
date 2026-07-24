import {and,count,eq,sql} from "drizzle-orm";
import {currentUser} from "@/server/auth/user";
import {getDatabase} from "@/server/database/client";
import {pointAccounts,tripImageTasks,trips} from "@/server/database/schema";
import {apiError,HttpError} from "@/server/http";
function maskEmail(email:string){const [name,domain]=email.split("@");return `${name!.slice(0,2)}${"*".repeat(Math.max(2,Math.min(6,name!.length-2)))}@${domain}`;}
export async function GET(){try{const user=await currentUser();if(!user)throw new HttpError(401,"请先登录","LOGIN_REQUIRED");const db=getDatabase();const [[points],[tripTotal],[posterTotal]]=await Promise.all([db.select().from(pointAccounts).where(eq(pointAccounts.userId,user.id)).limit(1),db.select({value:count()}).from(trips).where(eq(trips.userId,user.id)),db.select({value:sql<number>`count(distinct ${tripImageTasks.id})`}).from(tripImageTasks).innerJoin(trips,eq(tripImageTasks.tripId,trips.id)).where(and(eq(trips.userId,user.id),eq(tripImageTasks.status,"succeeded"),eq(tripImageTasks.imageType,"travel_poster")))]);return Response.json({emailMasked:maskEmail(user.email),points:{available:points?.availablePoints??0,reserved:points?.reservedPoints??0,lifetimeGranted:points?.lifetimeGranted??0,lifetimeConsumed:points?.lifetimeConsumed??0},tripCount:tripTotal?.value??0,posterCount:Number(posterTotal?.value??0)});}catch(error){return apiError(error);}}
