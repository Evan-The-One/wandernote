import { paymentConfig, pointPackages } from "@/config/commerce";

export async function GET() {
  return Response.json({
    enabled: paymentConfig.enabled && paymentConfig.provider === "creem",
    provider: paymentConfig.enabled ? paymentConfig.provider : "disabled",
    mode: paymentConfig.creemMode,
    packages: pointPackages.map((pack) => ({ id: pack.id, points: pack.points, amountCents: pack.amountCents, currency: pack.currency })),
    pointRules: { oneToTwoDays: 1, threeToFourDays: 2, fiveToSixDays: 3, sevenDays: 4 },
  });
}
