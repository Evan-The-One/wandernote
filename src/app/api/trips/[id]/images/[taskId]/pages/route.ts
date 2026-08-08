import{and,asc,eq}from"drizzle-orm";
import{currentUser}from"@/server/auth/user";
import{getDatabase}from"@/server/database/client";
import{posterPages,tripImageTasks,trips}from"@/server/database/schema";
import{apiError,HttpError}from"@/server/http";
export async function GET(_request:Request,{params}:{params:Promise<{id:string;taskId:string}>}){try{const user=await currentUser();if(!user)throw new HttpError(401,"登录后可查看旅行海报","LOGIN_REQUIRED");const{id,taskId}=await params,db=getDatabase();const[owned]=await db.select({id:tripImageTasks.id}).from(tripImageTasks).innerJoin(trips,eq(tripImageTasks.tripId,trips.id)).where(and(eq(trips.id,id),eq(trips.userId,user.id),eq(tripImageTasks.id,taskId))).limit(1);if(!owned)throw new HttpError(404,"没有找到海报任务","POSTER_NOT_FOUND");const items=await db.select({id:posterPages.id,pageIndex:posterPages.pageIndex,width:posterPages.width,height:posterPages.height,fileSize:posterPages.fileSize,mimeType:posterPages.mimeType}).from(posterPages).where(eq(posterPages.posterTaskId,taskId)).orderBy(asc(posterPages.pageIndex));return Response.json({items},{headers:{"cache-control":"private, no-store"}})}catch(error){return apiError(error)}}
