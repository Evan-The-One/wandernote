export const pointPackages = [
  { id: "points_3", points: 3, priceCny: 9.9 },
  { id: "points_8", points: 8, priceCny: 24.9 },
  { id: "points_20", points: 20, priceCny: 49.9 },
] as const;

export const posterPointCost = (days: number) => Math.ceil(Math.max(1, Math.min(7, days)) / 2);

export const paymentConfig = {
  enabled: process.env.PAYMENTS_ENABLED === "true",
  provider: process.env.PAYMENT_PROVIDER || "disabled",
} as const;

export function assertPaymentConfiguration() {
  if (!paymentConfig.enabled) return { enabled: false as const, reason: "点数购买即将开放" };
  if (!['creem', 'stripe'].includes(paymentConfig.provider)) throw new Error("PAYMENT_PROVIDER_NOT_SUPPORTED");
  return { enabled: true as const, provider: paymentConfig.provider };
}
