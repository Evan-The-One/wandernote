import { eq } from "drizzle-orm";
import { getDatabase } from "@/server/database/client";
import { users } from "@/server/database/schema";

export type GenerationAccessMode = "normal" | "tester_unlimited";

export type GenerationAccessPolicy = {
  mode: GenerationAccessMode;
  enforceDailyFullGenerationLimit: boolean;
  enforceDailyWholeDayRevisionLimit: boolean;
  enforceDailyPartialRevisionLimit: boolean;
  enforcePosterPoints: true;
  enforceBurstRateLimit: true;
  enforceGlobalKillSwitch: true;
};

const normalPolicy: GenerationAccessPolicy = {
  mode: "normal",
  enforceDailyFullGenerationLimit: true,
  enforceDailyWholeDayRevisionLimit: true,
  enforceDailyPartialRevisionLimit: true,
  enforcePosterPoints: true,
  enforceBurstRateLimit: true,
  enforceGlobalKillSwitch: true,
};

export function generationAccessPolicy(mode: GenerationAccessMode): GenerationAccessPolicy {
  if (mode !== "tester_unlimited") return normalPolicy;
  return {
    ...normalPolicy,
    mode: "tester_unlimited",
    enforceDailyFullGenerationLimit: false,
    enforceDailyWholeDayRevisionLimit: false,
    enforceDailyPartialRevisionLimit: false,
  };
}

export async function resolveGenerationAccess(userId: string | null | undefined): Promise<GenerationAccessPolicy> {
  if (!userId) return normalPolicy;
  const [account] = await getDatabase().select({ mode: users.generationAccessMode }).from(users)
    .where(eq(users.id, userId)).limit(1);
  return generationAccessPolicy(account?.mode === "tester_unlimited" ? "tester_unlimited" : "normal");
}
