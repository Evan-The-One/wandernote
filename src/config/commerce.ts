export type PointPackage = {
  id: string;
  points: number;
  amountCents: number;
  currency: "USD";
  productEnv: "CREEM_PRODUCT_POINTS_4" | "CREEM_PRODUCT_POINTS_10" | "CREEM_PRODUCT_POINTS_25";
};

export const pointPackages: readonly PointPackage[] = [
  { id: "creem_points_4_usd", points: 4, amountCents: 399, currency: "USD", productEnv: "CREEM_PRODUCT_POINTS_4" },
  { id: "creem_points_10_usd", points: 10, amountCents: 899, currency: "USD", productEnv: "CREEM_PRODUCT_POINTS_10" },
  { id: "creem_points_25_usd", points: 25, amountCents: 1899, currency: "USD", productEnv: "CREEM_PRODUCT_POINTS_25" },
] as const;

export const legacyPointPackageIds = ["points_3", "points_8", "points_20"] as const;

export const posterPointCost = (days: number) => Math.ceil(Math.max(1, Math.min(7, days)) / 2);

export const paymentConfig = {
  enabled: process.env.PAYMENTS_ENABLED === "true",
  provider: process.env.PAYMENT_PROVIDER || "disabled",
  creemMode: process.env.CREEM_MODE === "production" ? "production" : "test",
} as const;

export function assertPaymentConfiguration() {
  if (!paymentConfig.enabled) return { enabled: false as const, reason: "点数购买即将开放" };
  if (!['creem', 'stripe'].includes(paymentConfig.provider)) throw new Error("PAYMENT_PROVIDER_NOT_SUPPORTED");
  if (paymentConfig.provider === "stripe") throw new Error("PAYMENT_PROVIDER_NOT_CONFIGURED");
  if (!process.env.CREEM_API_KEY || !process.env.CREEM_WEBHOOK_SECRET) throw new Error("PAYMENT_PROVIDER_NOT_CONFIGURED");
  if (paymentConfig.creemMode === "production" && process.env.CREEM_PRODUCTION_APPROVED !== "true") throw new Error("CREEM_PRODUCTION_NOT_APPROVED");
  return { enabled: true as const, provider: paymentConfig.provider };
}

export function getPointPackage(packId: string) {
  return pointPackages.find((item) => item.id === packId) ?? null;
}

export function getCreemProductId(pack: PointPackage) {
  return process.env[pack.productEnv]?.trim() || null;
}
