import{and,eq}from"drizzle-orm";
import{currentMiniappUser,readMiniappJson,revokeMiniappSession}from"@/server/auth/miniapp";
import{getDatabase}from"@/server/database/client";
import{accountDeletionRequests}from"@/server/database/schema";
import{apiError,HttpError}from"@/server/http";

export async function POST(request:Request){try{const user=await currentMiniappUser(request),body=await readMiniappJson(request);if(!body||typeof body!=="object"||!("confirmed" in body)||body.confirmed!==true)throw new HttpError(400,"请确认注销影响","CONFIRMATION_REQUIRED");const db=getDatabase();const[existing]=await db.select({id:accountDeletionRequests.id}).from(accountDeletionRequests).where(and(eq(accountDeletionRequests.userId,user.id),eq(accountDeletionRequests.status,"pending"))).limit(1);if(!existing)await db.insert(accountDeletionRequests).values({userId:user.id});await revokeMiniappSession(request);return Response.json({ok:true,message:"注销申请已提交，我们会按流程处理账户数据。"},{headers:{"cache-control":"no-store"}})}catch(error){return apiError(error)}}
