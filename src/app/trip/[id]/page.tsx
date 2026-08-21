import { GeneratedPlanView } from "@/features/trip-plan/generated-plan-view";

export default async function TripPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ share?: string }> }) {
  const { id } = await params;
  const { share } = await searchParams;
  return <GeneratedPlanView tripId={id} shareToken={share} />;
}
