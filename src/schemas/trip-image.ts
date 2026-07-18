import { z } from "zod";

export const tripImageAspectRatioSchema = z.enum(["3:4", "9:16", "1:1"]);
export const tripImageTypeSchema = z.enum(["premium_trip", "travel_poster"]);
export const tripImageCreateSchema = z.object({
  aspectRatio: tripImageAspectRatioSchema,
  imageType: z.literal("travel_poster").default("travel_poster"),
  idempotencyKey: z.string().trim().min(16).max(100),
});

const templateActivitySchema = z.object({
  time: z.string().max(5),
  name: z.string().max(80),
  area: z.string().max(60),
  durationMinutes: z.number().int().positive(),
  reason: z.string().max(120),
  transport: z.object({ method: z.string().max(30), durationMinutes: z.number().int().nonnegative() }).nullable(),
});
const templateDaySchema = z.object({
  dayNumber: z.number().int().positive(), date: z.string().nullable(), title: z.string().max(100), theme: z.string().max(100),
  activities: z.array(templateActivitySchema).min(1).max(20), tips: z.array(z.string().max(140)).max(3),
});
export const tripImageTemplateSpecSchema = z.object({
  template: z.literal("classic_timeline"), templateVersion: z.literal("classic_timeline_v1"),
  tripId: z.string().uuid(), tripVersion: z.number().int().positive(), aspectRatio: tripImageAspectRatioSchema,
  title: z.string().max(120), destination: z.string().max(60), daysCount: z.number().int().min(1).max(7),
  theme: z.string().max(180), stayArea: z.string().max(100), transportAdvice: z.string().max(180),
  reminder: z.string().max(180), days: z.array(templateDaySchema).min(1).max(7),
  heroImage: z.object({ sourceType: z.enum(["static", "uploaded", "external", "generated"]), sourceUrl: z.string().nullable(), assetId: z.string().nullable(), altText: z.string(), attribution: z.string().nullable(), generatedAt: z.string().nullable(), generationJobId: z.string().nullable() }),
});
const posterActivitySchema = z.object({ time: z.string().max(5), name: z.string().max(48), note: z.string().max(54) });
const posterDaySchema = z.object({ dayNumber: z.number().int().positive(), title: z.string().max(48), city: z.string().max(32), activities: z.array(posterActivitySchema).min(1).max(5) });
const posterPageSchema = z.object({ pageNumber: z.number().int().positive(), dayRange: z.string().max(24), backgroundDataUrl: z.string().startsWith("data:image/webp;base64,").max(2_500_000), days: z.array(posterDaySchema).max(2), kind: z.enum(["cover", "days", "summary"]) });
export const travelPosterSpecSchema = z.object({
  kind: z.literal("travel_poster"), version: z.literal("travel_poster_v1"), tripId: z.string().uuid(), tripVersion: z.number().int().positive(), aspectRatio: tripImageAspectRatioSchema,
  title: z.string().max(70), subtitle: z.string().max(90), destination: z.string().max(60), daysCount: z.number().int().min(1).max(7), stayArea: z.string().max(80), reminder: z.string().max(100),
  pages: z.array(posterPageSchema).min(1).max(5), model: z.string().max(80), quality: z.enum(["low", "medium", "high"]), estimatedCostUsd: z.number().nonnegative(),
});
export const tripImageOutputSchema = z.union([tripImageTemplateSpecSchema, travelPosterSpecSchema]);
export const tripImageTaskSchema = z.object({
  id: z.string().uuid(), tripId: z.string().uuid(), tripVersion: z.number().int().positive(), imageType: tripImageTypeSchema,
  aspectRatio: tripImageAspectRatioSchema, templateVersion: z.string(), provider: z.string(),
  status: z.enum(["pending", "running", "succeeded", "failed"]), output: tripImageOutputSchema.nullable(),
  failureCode: z.string().nullable(), createdAt: z.string(), completedAt: z.string().nullable(),
});

export type TripImageAspectRatio = z.infer<typeof tripImageAspectRatioSchema>;
export type TripImageTemplateSpec = z.infer<typeof tripImageTemplateSpecSchema>;
export type TripImageTask = z.infer<typeof tripImageTaskSchema>;
export type TravelPosterSpec = z.infer<typeof travelPosterSpecSchema>;
