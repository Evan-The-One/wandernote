import {and,eq} from "drizzle-orm";
import {currentUser} from "@/server/auth/user";
import {getDatabase} from "@/server/database/client";
import {posterPages,tripImageTasks,trips} from "@/server/database/schema";
import {apiError,HttpError} from "@/server/http";
import {readPrivatePoster} from "@/server/posters/storage";

export async function GET(_request:Request,{params}:{params:Promise<{id:string;taskId:string;pageId:string}>}){
  try{
    const user=await currentUser();
    if(!user)throw new HttpError(401,"登录后可查看旅行海报","LOGIN_REQUIRED");
    const{id,taskId,pageId}=await params;
    const[page]=await getDatabase().select({storageKey:posterPages.storageKey,mimeType:posterPages.mimeType,checksum:posterPages.checksum,status:tripImageTasks.status}).from(posterPages).innerJoin(tripImageTasks,eq(posterPages.posterTaskId,tripImageTasks.id)).innerJoin(trips,eq(tripImageTasks.tripId,trips.id)).where(and(eq(trips.id,id),eq(trips.userId,user.id),eq(posterPages.userId,user.id),eq(posterPages.posterTaskId,taskId),eq(posterPages.id,pageId))).limit(1);
    if(!page)throw new HttpError(404,"没有找到这张海报","POSTER_PAGE_NOT_FOUND");
    if(page.status!=="succeeded")throw new HttpError(409,"海报还没有准备好","POSTER_SCHEMA_INCOMPATIBLE");
    const object=await readPrivatePoster(page.storageKey);
    return new Response(object.stream,{headers:{"content-type":object.contentType||page.mimeType,"content-length":String(object.size),etag:object.etag,"cache-control":"private, no-store","content-disposition":"inline; filename=travel-poster.jpg","x-content-type-options":"nosniff"}});
  }catch(error){return apiError(error)}
}
