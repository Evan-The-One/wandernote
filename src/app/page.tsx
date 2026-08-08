import { BetaAccessGate } from "@/features/beta/beta-access-gate";
import { TripForm } from "@/features/trip-input/trip-form";
import { HangzhouSamplePreview } from "@/features/trip-plan/hangzhou-sample-preview";
import { hasBetaAccess } from "@/server/auth/visitor";
import { serverConfig } from "@/server/config";
import {AppIcon,type AppIconName} from "@/components/app-icons";
import {posterExamples} from "@/config/poster-examples";
import Image from "next/image";

function HomePosterShowcase({mobile=false}:{mobile?:boolean}){
  const example=posterExamples[0];
  if(!example)return null;
  return <section className={mobile?"home-poster-showcase-mobile app-container pb-5 pt-4":"home-poster-showcase-desktop mt-8"} aria-label="旅行海报示例">
    <div className="overflow-hidden rounded-[24px] border border-[var(--border-soft)] bg-white p-3 shadow-[0_16px_38px_rgba(23,79,59,.08)] sm:p-4">
      <div className="grid grid-cols-[124px_1fr] items-center gap-4 sm:grid-cols-[156px_1fr]">
        <Image src={example.thumbnailAsset} alt={`${example.title}旅行海报示例`} width={1024} height={1536} className="h-auto w-full rounded-[16px] border border-[var(--border-soft)]" sizes={mobile?"124px":"156px"}/>
        <div className="min-w-0 pr-1"><p className="text-xs font-bold text-[var(--warning)]">生成后的效果</p><h2 className="mt-1.5 text-lg font-bold leading-7 text-[var(--text-strong)]">看看生成后的旅行海报</h2><p className="mt-1.5 text-sm leading-6 text-[var(--text-secondary)]">行程规划好之后，还能生成清晰、适合保存分享的专属海报。</p><a href="/sample-plan" className="mt-3 inline-flex min-h-11 items-center font-semibold text-[var(--brand-primary)]">看看完整示例 <span aria-hidden="true" className="ml-1">→</span></a></div>
      </div>
    </div>
  </section>;
}

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
        <div className="home-hero px-1 pt-1 lg:sticky lg:top-28 lg:self-start">
          <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-sm font-semibold text-[var(--brand-primary)] shadow-sm"><i className="h-2 w-2 rounded-full bg-[var(--accent-warm)]"/>AI 私人旅行管家</span>
          <h1 className="app-hero-title mt-3 text-[var(--text-strong)]">不用查攻略<br/><span className="text-[var(--brand-primary)]">告诉我去哪儿</span><br/>行程直接安排好</h1>
          <p className="mt-2 max-w-md text-sm leading-6 text-[var(--text-secondary)] sm:mt-4 sm:text-base sm:leading-7">去哪儿、玩几天、想怎么玩，两步就安排好。</p>
          <HomePosterShowcase/>
        </div>
        <BetaAccessGate initialOpen={betaOpen}><TripForm /></BetaAccessGate>
      </div>
    </section>
    <HomePosterShowcase mobile/>
    <section className="app-container py-8 sm:py-14">
      <div className="flex items-end justify-between gap-6"><div><p className="text-sm font-bold text-[var(--warning)]">示例行程</p><h2 className="app-section-title mt-2">先看看生成后的旅行计划</h2><p className="mt-2 text-sm text-[var(--text-secondary)]">用杭州三日行程，看看一键出发会怎样安排。</p></div></div>
      <HangzhouSamplePreview />
    </section>
    <section className="app-container pb-16 pt-4 sm:pb-24">
      <div className="grid gap-7 md:grid-cols-3">{values.map(([icon,title,body,tone])=><article key={title} className="flex gap-4 md:block"><span className={`icon-bubble shrink-0 ${tone}`}><AppIcon name={icon}/></span><div><h3 className="mt-1 text-lg font-semibold text-[var(--text-strong)] md:mt-4">{title}</h3><p className="mt-1.5 leading-7 text-[var(--text-secondary)]">{body}</p></div></article>)}</div>
    </section>
  </main>;
}
