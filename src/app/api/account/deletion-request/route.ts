import { currentUser, signOutUser } from "@/server/auth/user";
import { getDatabase } from "@/server/database/client";
import { accountDeletionRequests } from "@/server/database/schema";
import { apiError, assertTrustedMutation, HttpError } from "@/server/http";

export async function POST(request:Request){try{assertTrustedMutation(request);const user=await currentUser();if(!user)throw new HttpError(401,"请先登录","LOGIN_REQUIRED");await getDatabase().insert(accountDeletionRequests).values({userId:user.id});await signOutUser();return Response.json({ok:true,message:"注销申请已提交。生成中的任务完成后不会再发起新任务，我们会按流程处理账户数据。"});}catch(error){return apiError(error);}}
