import { betaAccessSchema } from "@/schemas/beta";
import { grantBetaAccess, hasBetaAccess } from "@/server/auth/visitor";
import { serverConfig } from "@/server/config";
import { apiError, HttpError, readJsonBody, secureEqual } from "@/server/http";

export async function GET() {
  return Response.json({ enabled: Boolean(serverConfig.betaAccessCode), authorized: await hasBetaAccess(serverConfig.betaAccessCode) });
}

export async function POST(request: Request) {
  try {
    if (!serverConfig.betaAccessCode) return Response.json({ authorized: true });
    const parsed = betaAccessSchema.safeParse(await readJsonBody(request));
    if (!parsed.success || !secureEqual(parsed.data.code, serverConfig.betaAccessCode)) throw new HttpError(401, "测试访问码不正确", "INVALID_BETA_CODE");
    await grantBetaAccess(serverConfig.betaAccessCode);
    return Response.json({ authorized: true });
  } catch (error) { return apiError(error); }
}
