function positiveInteger(name: string, fallback: number) {
  const value = Number(process.env[name]);
  return Number.isInteger(value) && value > 0 ? value : fallback;
}

export const serverConfig = {
  aiEnabled: process.env.AI_GENERATION_ENABLED !== "false",
  fullGenerationDailyLimit: positiveInteger("FULL_GENERATION_DAILY_LIMIT", 3),
  dayRevisionDailyLimit: positiveInteger("DAY_REVISION_DAILY_LIMIT", 10),
  betaAccessCode: process.env.BETA_ACCESS_CODE?.trim() || null,
};
