import { TripForm } from "@/features/trip-input/trip-form";
import { BetaAccessGate } from "@/features/beta/beta-access-gate";
import { BrandMark } from "@/components/brand-mark";

export default function CreatePage() {
  return <main className="page-shell py-10 sm:py-16"><BetaAccessGate><div className="mb-9"><BrandMark size="compact" /><p className="mt-3 text-sm font-bold text-[#287057]">1分钟完成</p><h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-5xl">这次想去哪儿？</h1><p className="mt-4 text-[#65706a]">目的地、天数、玩法三项就够，其他需求都可以跳过。</p></div><TripForm /></BetaAccessGate></main>;
}
