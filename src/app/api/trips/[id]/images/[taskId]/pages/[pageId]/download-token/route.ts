import{and,eq}from"drizzle-orm";
import{currentUser}from"@/server/auth/user";
import{getDatabase}from"@/server/database/client";
import{posterPages,tripImageTasks,trips}from"@/server/database/schema";
import{apiError,HttpError}from"@/server/http";
import{createPosterDownloadUrl}from"@/server/posters/storage";
export async function POST(_request:Request,{params}:{params:Promise<{id:string;taskId:string;pageId:string}>}){try{const user=await currentUser();if(!user)throw new HttpError(401,"登录后可下载旅行海报","LOGIN_REQUIRED");const{id,taskId,pageId}=await params;const[page]=await getDatabase().select({storageKey:posterPages.storageKey}).from(posterPages).innerJoin(tripImageTasks,eq(posterPages.posterTaskId,tripImageTasks.id)).innerJoin(trips,eq(tripImageTasks.tripId,trips.id)).where(and(eq(trips.id,id),eq(trips.userId,user.id),eq(posterPages.userId,user.id),eq(posterPages.posterTaskId,taskId),eq(posterPages.id,pageId))).limit(1);if(!page)throw new HttpError(404,"没有找到这张海报","POSTER_PAGE_NOT_FOUND");return Response.json(await createPosterDownloadUrl(page.storageKey),{headers:{"cache-control":"private, no-store"}})}catch(error){return apiError(error)}}
