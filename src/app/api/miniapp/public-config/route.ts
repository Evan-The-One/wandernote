import { ensureMiniappAuthTables, miniappConfigured } from "@/server/auth/miniapp";
import { wechatPaymentConfigured, wechatPointPacks } from "@/server/payments/wechat-provider";

export async function GET() {
  await ensureMiniappAuthTables();
  const contactEmail = process.env.PUBLIC_CONTACT_EMAIL?.trim() || null;
  return Response.json({
    contactEmail,
    authConfigured: miniappConfigured(),
    payments: { enabled: wechatPaymentConfigured(), packs: wechatPointPacks.filter(pack => pack.enabled) },
    aiContentLabelVersion: process.env.AI_CONTENT_LABEL_VERSION || "v1",
    genAiRegistrationStatus: process.env.GEN_AI_SERVICE_REGISTRATION_STATUS || "unverified",
  }, { headers: { "cache-control": "public, max-age=300" } });
}
