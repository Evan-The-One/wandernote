import { z } from "zod";

export const betaAccessSchema = z.object({ code: z.string().trim().min(1).max(100) });
export const persistedRevisionSchema = z.object({
  targetDayNumber: z.number().int().positive(),
  instruction: z.string().trim().min(3).max(500),
  version: z.number().int().positive(),
  mode: z.enum(["full_day", "selected_activities"]).default("full_day"),
  selectedActivityIds: z.array(z.string().trim().min(1)).max(12).default([]),
});
export const undoDaySchema = z.object({ version: z.number().int().positive() });
export const feedbackSchema = z.object({
  rating: z.enum(["helpful", "usable", "not_helpful"]),
  issueTags: z.array(z.enum(["too_full", "too_empty", "bad_route", "inaccurate_place", "bad_budget", "preference_mismatch", "other"])).max(6).default([]),
  comment: z.string().trim().max(300).nullable().default(null),
});
