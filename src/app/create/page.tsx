import { TripForm } from "@/features/trip-input/trip-form";
import { BetaAccessGate } from "@/features/beta/beta-access-gate";
import { hasBetaAccess } from "@/server/auth/visitor";
import { serverConfig } from "@/server/config";

export default async function CreatePage() {
  const betaOpen = await hasBetaAccess(serverConfig.betaAccessCode);
  return <main className="page-shell py-8 sm:py-14"><BetaAccessGate initialOpen={betaOpen}><div className="mb-6"><p className="text-sm font-bold text-[#287057]">AI 私人旅行管家</p><h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-5xl">只需3步，一键直接出发</h1></div><TripForm /></BetaAccessGate></main>;
}
