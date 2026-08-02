import { BetaAccessGate } from "@/features/beta/beta-access-gate";
import { TripForm } from "@/features/trip-input/trip-form";
import { HangzhouSamplePreview } from "@/features/trip-plan/hangzhou-sample-preview";
import { hasBetaAccess } from "@/server/auth/visitor";
import { serverConfig } from "@/server/config";
import {TravelJourneyIllustration} from "@/components/travel-illustrations";
import {AppIcon,type AppIconName} from "@/components/app-icons";

export default async function Home() {
  const betaOpen = await hasBetaAccess(serverConfig.betaAccessCode);
  const values:[AppIconName,string,string,string][]=[
    ["sparkles","三项就能出发","目的地、天数和玩法选好，剩下的交给我们。","is-warm"],
    ["route","按天安排清楚","路线、时间和交通，都整理在每天的行程里。",""],
    ["edit","一句话就能改","只改不满意的部分，不必从头再来。","is-blue"],
  ];
  return <main>
    <section id="plan" className="relative overflow-hidden py-6 sm:py-14 lg:py-20">
      <div className="app-container relative grid items-center gap-8 lg:grid-cols-[.9fr_1.1fr] lg:gap-14">
        <div className="px-1 pt-2 lg:sticky lg:top-28 lg:self-start">
          <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-sm font-semibold text-[var(--brand-primary)] shadow-sm"><i className="h-2 w-2 rounded-full bg-[var(--accent-warm)]"/>AI 私人旅行管家</span>
          <h1 className="app-hero-title mt-5 text-[var(--text-strong)]">不用查攻略<br/><span className="text-[var(--brand-primary)]">告诉我去哪儿</span><br/>行程直接安排好</h1>
          <p className="mt-4 max-w-md text-base leading-7 text-[var(--text-secondary)]">少填一点，早点出发。三步生成一份可以直接照着玩的旅行计划。</p>
          <TravelJourneyIllustration className="mt-6 w-full max-w-[500px] drop-shadow-[0_18px_36px_rgba(23,79,59,.08)]"/>
        </div>
        <BetaAccessGate initialOpen={betaOpen}><TripForm /></BetaAccessGate>
      </div>
    </section>
    <section className="app-container py-12 sm:py-16">
      <div className="flex items-end justify-between gap-6"><div><p className="text-sm font-bold text-[var(--warning)]">生成后的样子</p><h2 className="app-section-title mt-2">先看一眼，再决定去哪儿</h2></div></div>
      <HangzhouSamplePreview />
    </section>
    <section className="app-container pb-16 pt-4 sm:pb-24">
      <div className="grid gap-7 md:grid-cols-3">{values.map(([icon,title,body,tone])=><article key={title} className="flex gap-4 md:block"><span className={`icon-bubble shrink-0 ${tone}`}><AppIcon name={icon}/></span><div><h3 className="mt-1 text-lg font-semibold text-[var(--text-strong)] md:mt-4">{title}</h3><p className="mt-1.5 leading-7 text-[var(--text-secondary)]">{body}</p></div></article>)}</div>
    </section>
  </main>;
}
