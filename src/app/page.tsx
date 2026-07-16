import { SectionHeading } from "@/components/section-heading";
import { BetaAccessGate } from "@/features/beta/beta-access-gate";
import { TripForm } from "@/features/trip-input/trip-form";
import { HangzhouSamplePreview } from "@/features/trip-plan/hangzhou-sample-preview";
import { hasBetaAccess } from "@/server/auth/visitor";
import { serverConfig } from "@/server/config";

export default async function Home() {
  const betaOpen = await hasBetaAccess(serverConfig.betaAccessCode);
  return <main>
    <section id="plan" className="relative overflow-hidden py-12 sm:py-20">
      <div className="absolute -right-24 top-8 h-80 w-80 rounded-full bg-[#dbe9d7] blur-3xl" />
      <div className="absolute -left-24 bottom-0 h-64 w-64 rounded-full bg-[#f3d9ad] blur-3xl" />
      <div className="page-shell relative">
        <div className="mb-6 max-w-3xl">
          <span className="inline-flex rounded-full border border-[#245b46]/15 bg-white/70 px-3 py-1.5 text-sm font-semibold text-[#245b46]">AI 私人旅行管家</span>
          <h1 className="mt-4 font-bold leading-tight tracking-[-.04em]"><span className="block whitespace-nowrap text-[clamp(1.65rem,7.2vw,3rem)]">不用查攻略，只需 3 步</span><span className="mt-1 block whitespace-nowrap text-[clamp(1.8rem,7.7vw,3.3rem)] text-[#245b46]">一键定制专属旅行</span></h1>
        </div>
        <BetaAccessGate initialOpen={betaOpen}><TripForm /></BetaAccessGate>
        <HangzhouSamplePreview />
      </div>
    </section>
    <section className="page-shell py-16 sm:py-20">
      <SectionHeading eyebrow="这几天这样玩" title="不是景点清单，是属于你的旅行节奏" description="从每日顺序、餐饮安排到交通建议，把分散的信息整理成一份清晰、好读、随时可以调整的计划。" />
      <div className="mt-10 grid gap-5 md:grid-cols-3">{[
        ["01", "三项就能出发", "目的地、天数和玩法选好，就可以直接生成。"],
        ["02", "按天安排清楚", "每一天都有主题、时间轴、交通和行动建议。"],
        ["03", "一句话就能改", "哪天不满意，只调整当天，其他日期保持不变。"],
      ].map(([number,title,body]) => <article key={number} className="card rounded-3xl p-7"><span className="text-sm font-bold text-[#d48a35]">{number}</span><h3 className="mt-8 text-xl font-bold">{title}</h3><p className="mt-3 leading-7 text-[#65706a]">{body}</p></article>)}</div>
    </section>
  </main>;
}
