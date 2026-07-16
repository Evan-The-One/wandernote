function positiveInteger(name: string, fallback: number) {
  const value = Number(process.env[name]);
  return Number.isInteger(value) && value > 0 ? value : fallback;
}

export const serverConfig = {
  aiEnabled: process.env.AI_GENERATION_ENABLED !== "false",
  fullGenerationDailyLimit: positiveInteger("DAILY_FULL_GENERATION_LIMIT", 2),
  dayRevisionDailyLimit: positiveInteger("DAILY_DAY_REVISION_LIMIT", 2),
  partialRevisionDailyLimit: positiveInteger("DAILY_PARTIAL_REVISION_LIMIT", 5),
  ipHourlyLimit: positiveInteger("AI_IP_HOURLY_LIMIT", 12),
  globalConcurrentLimit: positiveInteger("AI_GLOBAL_CONCURRENT_LIMIT", 6),
  dailyAiSoftBudgetUsd: Number(process.env.DAILY_AI_SOFT_BUDGET_USD || 5),
  dailyAiHardBudgetUsd: Number(process.env.DAILY_AI_HARD_BUDGET_USD || 8),
  betaAccessCode: process.env.BETA_ACCESS_CODE?.trim() || null,
};
