import { tripInputSchema } from "./trip";
import type { TripInput } from "@/types/trip";

const oldInterestMap: Record<string, TripInput["priorities"][number]> = {
  food: "great_food", photography: "photogenic", culture: "culture", nature: "nature",
  shopping: "value_for_money", coffee: "hidden_gems", entertainment: "nightlife",
};

export function migrateTripInput(value: unknown): TripInput | null {
  const current = tripInputSchema.safeParse(value);
  if (current.success) return current.data;
  if (!value || typeof value !== "object") return null;
  const old = value as Record<string, unknown>;
  if (old.schemaVersion !== "0.1") return null;
  const destination = old.destination as { city?: string; country?: string } | undefined;
  const travelers = old.travelers as { adults?: number; children?: number } | undefined;
  const budget = old.budget as { amount?: number } | undefined;
  const interests = Array.isArray(old.interests) ? old.interests : [];
  const migrated = {
    schemaVersion: "0.2",
    destination: { city: destination?.city ?? "", country: destination?.country ?? "中国" },
    days: old.days,
    travelStyle: old.travelStyle,
    datePreference: { type: old.startDate ? "exact" : "undecided", startDate: old.startDate || null, approximateText: null },
    budget: budget?.amount ? { mode: "custom", amount: budget.amount, scope: "total", includesAccommodation: false, includesIntercityTransport: false, currency: "CNY" } : { mode: "unrestricted", amount: null, scope: null, includesAccommodation: null, includesIntercityTransport: null, currency: "CNY" },
    priorities: interests.map((item) => oldInterestMap[String(item)]).filter(Boolean).slice(0, 3),
    departureCity: null,
    companionType: "solo",
    travelers: { adults: travelers?.adults ?? 1, children: travelers?.children ?? 0, seniors: 0 },
    preferredWakeTime: null,
    preferredDepartureTime: null,
    transportPreference: "mixed",
    dayTripPreference: false,
    additionalRequirements: old.additionalRequirements || null,
  };
  const result = tripInputSchema.safeParse(migrated);
  return result.success ? result.data : null;
}
