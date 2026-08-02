import { z } from "zod";
import { apiError, HttpError } from "@/server/http";
import { exchangeWechatCode, loginWechatIdentity, readMiniappJson } from "@/server/auth/miniapp";
const schema = z.object({ code: z.string().min(4).max(128), requestId: z.string().min(8).max(100) });
export async function POST(request: Request) { let requestId:string|undefined;try { const parsed=schema.safeParse(await readMiniappJson(request));if(!parsed.success)throw new HttpError(400,"登录请求无效，请重新进入","INVALID_LOGIN_REQUEST");const input=parsed.data;requestId=input.requestId; const identity = await exchangeWechatCode(input.code); return Response.json(await loginWechatIdentity(identity.providerSubjectHash), { headers: { "cache-control": "no-store","x-request-id":requestId } }); } catch (error) { return apiError(error,{requestId,stage:"wechat_login"}); } }
