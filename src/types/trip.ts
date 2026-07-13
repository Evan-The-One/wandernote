import type { z } from "zod";
import type { activitySchema, dayPlanSchema, dayRevisionRequestSchema, dayRevisionResponseSchema, tripInputSchema, tripPlanSchema } from "@/schemas/trip";

export type TripInput = z.infer<typeof tripInputSchema>;
export type Activity = z.infer<typeof activitySchema>;
export type DayPlan = z.infer<typeof dayPlanSchema>;
export type TripPlan = z.infer<typeof tripPlanSchema>;
export type DayRevisionRequest = z.infer<typeof dayRevisionRequestSchema>;
export type DayRevisionResponse = z.infer<typeof dayRevisionResponseSchema>;
