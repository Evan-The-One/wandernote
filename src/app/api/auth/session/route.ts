import { currentUser, signOutUser, userAuthConfigured } from "@/server/auth/user";
import { ensureVisitor } from "@/server/auth/visitor";
import { recordAnalyticsEvent } from "@/server/database/analytics";
import { apiError, assertTrustedMutation } from "@/server/http";
export async function GET(){const user=await currentUser();return Response.json({authenticated:Boolean(user),email:user?.email??null,generationAccessMode:user?.generationAccessMode??"normal",configured:userAuthConfigured()},{headers:{"cache-control":"no-store, private"}});}
export async function DELETE(request:Request){try{assertTrustedMutation(request);const visitor=await ensureVisitor();const user=await currentUser();const result=await signOutUser();await recordAnalyticsEvent({visitorId:visitor.visitorId,eventName:"logout_succeeded",status:"completed",metadata:{hadSession:Boolean(user),revoked:result.revoked}}).catch(()=>undefined);return new Response(null,{status:204,headers:{"cache-control":"no-store"}});}catch(error){return apiError(error);}}
