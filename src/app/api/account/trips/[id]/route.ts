import {and,eq} from "drizzle-orm";
import {currentUser} from "@/server/auth/user";
import {getDatabase} from "@/server/database/client";
import {trips} from "@/server/database/schema";
import {apiError,HttpError} from "@/server/http";
export async function DELETE(_:Request,{params}:{params:Promise<{id:string}>}){try{const user=await currentUser();if(!user)throw new HttpError(401,"请先登录","LOGIN_REQUIRED");const {id}=await params;const removed=await getDatabase().delete(trips).where(and(eq(trips.id,id),eq(trips.userId,user.id))).returning({id:trips.id});if(!removed.length)throw new HttpError(404,"没有找到这份攻略","TRIP_NOT_FOUND");return new Response(null,{status:204});}catch(error){return apiError(error);}}
