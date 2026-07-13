import { GeneratedPlanView } from "@/features/trip-plan/generated-plan-view";

export default async function TripPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <GeneratedPlanView tripId={id} />;
}
