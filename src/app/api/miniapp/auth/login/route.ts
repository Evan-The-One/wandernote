import { z } from "zod";
import { apiError } from "@/server/http";
import { exchangeWechatCode, loginWechatIdentity, readMiniappJson } from "@/server/auth/miniapp";
const schema = z.object({ code: z.string().min(4).max(128), requestId: z.string().min(8).max(100) });
export async function POST(request: Request) { try { const input = schema.parse(await readMiniappJson(request)); const identity = await exchangeWechatCode(input.code); return Response.json(await loginWechatIdentity(identity.providerSubjectHash), { headers: { "cache-control": "no-store" } }); } catch (error) { return apiError(error); } }
