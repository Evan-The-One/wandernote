"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import type { DayPlan, TripInput, TripPlan } from "@/types/trip";
import { priorityOptions } from "@/features/trip-input/options";
import { DayFeedback } from "@/features/feedback/day-feedback";
import {
  formatDisplayText,
  formatPriority,
  formatActivityCount,
} from "./display-formatters";
import { DayImageExport } from "./day-image-export";
import { DayRoute, summarizeDayRoute } from "./day-route";
import { trackEvent } from "@/features/analytics/client";
import { IntercitySummary } from "./intercity-summary";

const method = {
  walk: "步行",
  public_transport: "公共交通",
  taxi: "打车",
  mixed: "组合交通",
};
const mainTypes = new Set(["attraction", "shopping", "entertainment"]);
function routePreview(day: DayPlan) {
  const names=day.activities.filter(activity=>mainTypes.has(activity.type)).slice(0,4).map(activity=>activity.name);
  return names.join(" → ");
}
function friendlySummary(value:string){
  const clean=value.replace(/根据你的需求|根据用户需求|综合考虑(?:了)?|进行(?:了)?(?:路线)?优化|覆盖(?:了)?代表性地点/g,"").replace(/最具代表性的/g,"很有辨识度的").replace(/代表性/g,"经典").replace(/建立城市(?:感|印象)/g,"先看看城市全貌").replace(/高含金量/g,"值得去").replace(/核心体验/g,"重点").replace(/适合作为/g,"可以放在").replace(/\s+/g," ").trim();
  return clean.split(/(?<=[。！？])/u).filter(Boolean).slice(0,5).join("")||"把每天的地点放在相邻区域，少走回头路，把时间留给真正想看的地方。";
}
function friendlyReason(value:string){return friendlySummary(value).split(/(?<=[。！？])/u).filter(Boolean)[0]?.slice(0,70)||"顺路安排，到了就能直接开始体验。";}
function dayAreas(destination:string,areas:string){return areas.includes(destination)?areas:`${destination}·${areas}`;}
function friendlyWhy(plan:TripPlan,input:TripInput){
  const first=plan.days[0]?summarizeDayRoute(plan.days[0]).areas:"核心区域";const second=plan.days[1]?summarizeDayRoute(plan.days[1]).areas:null;
  const pace=input.travelStyle==="fast_paced"?"多看几个重点":input.travelStyle==="lazy"?"少换地方、多留休息":"每个地方多留一点时间";
  return [`你有${plan.days.length}天，所以每天集中在相邻区域，${pace}。`,`第一天先玩${first}${second?`，第二天再到${second}`:""}。`,`这样少走回头路，也不用一直赶路。`];
}
function stayLabel(minutes:number){if(minutes<=45)return "约30–45分钟";if(minutes<=75)return "约60分钟";if(minutes<=105)return "约60–90分钟";if(minutes<=150)return "约90–120分钟";return `约${Math.round(minutes/30)*30}分钟`;}
function displayTripTitle(input:TripInput){const prefix=`${input.destination.city}${input.days}日`;const suffix:Record<TripInput["travelStyle"],string>={fast_paced:"高效打卡路线",slow:"慢游路线",lazy:"轻松游路线",food:"美食漫游路线",romantic:"城市约会路线",family:"亲子轻松路线"};return `${prefix}${suffix[input.travelStyle]}`;}

export function TripPlanView({
  plan,
  input,
  onReviseDay,
  notice,
  canUndo,
  onUndo,
  canEdit,
  tripId,
  highlightedActivityIds = [],
}: {
  plan: TripPlan;
  input: TripInput;
  onReviseDay?: (day: DayPlan) => void;
  notice?: string[];
  canUndo?: boolean;
  onUndo?: () => void;
  canEdit?: boolean;
  tripId?: string;
  highlightedActivityIds?: string[];
}) {
  const [copied, setCopied] = useState(false);
  const budgetLabel =
    plan.budget.estimateType === "exact" && plan.budget.estimatedTotal !== null
      ? `预计 ¥${plan.budget.estimatedTotal}`
      : plan.budget.estimateType === "range" && plan.budget.estimatedRange
        ? `参考 ¥${plan.budget.estimatedRange.min}–${plan.budget.estimatedRange.max}`
        : "按偏好灵活安排";
  const understanding = useMemo(() => {
    const counts = plan.days.map(
      (day) =>
        day.activities.filter((activity) => mainTypes.has(activity.type))
          .length,
    );
    const walking =
      plan.days.reduce((sum, day) => sum + day.estimatedWalkingKm, 0) /
      plan.days.length;
    return {
      mainActivities: formatActivityCount(Math.min(...counts),Math.max(...counts)).replace("个","个体验点"),
      intensity: walking <= 4 ? "轻松" : walking <= 7 ? "适中" : "较满",
    };
  }, [plan]);
  const priorities = input.priorities.map(
    (value) =>
      priorityOptions.find((item) => item.value === value)?.label ||
      formatPriority(value),
  );
  async function share() {
    if (!tripId) return;
    trackEvent("share_clicked", { pageName: "trip", tripId });
    const url = `https://www.yjchufa.com/trip/${encodeURIComponent(tripId)}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: displayTripTitle(input),
          text: `一起看看${plan.destination.city}旅行计划`,
          url,
        });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError")
          return;
      }
    }
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }
  return (
    <main className="pb-20">
      {!canEdit && (
        <section className="border-b border-[#245b46]/10 bg-[#eaf2ed]">
          <div className="page-shell flex flex-col gap-3 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-bold text-[#245b46]">
                朋友邀请你一起看看这份旅行计划
              </p>
              <p className="mt-1 text-sm text-[#65706a]">
                只读查看，不需要登录。
              </p>
            </div>
            <Link
              href="/#plan"
              className="rounded-full bg-[#245b46] px-5 py-2.5 text-center text-sm font-bold text-white"
            >
              我也想规划一次
            </Link>
          </div>
        </section>
      )}
      <section className="bg-[#204f3c] py-14 text-white sm:py-20">
        <div className="page-shell">
          <p className="text-sm font-semibold text-white/65">
            {plan.destination.city} · {plan.days.length}天
          </p>
          <h1 className="mt-3 text-4xl font-bold sm:text-6xl">这几天这样玩</h1>
          <p className="mt-3 text-xl font-semibold text-white/85">
            {displayTripTitle(input)}
          </p>
          <div className="mt-6 space-y-2 text-sm font-medium leading-6 text-white/75 sm:text-base">
            {plan.days.slice(0,3).map(day=><p key={day.dayNumber}>{routePreview(day)}</p>)}
          </div>
        </div>
      </section>
      <section className="page-shell mt-6">
        <div className="card rounded-3xl p-5 sm:p-8">
          <p className="text-sm font-bold text-[#287057]">
            我帮你这样安排
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {[
              ["每天安排", understanding.mainActivities],
              ["整体强度", understanding.intensity],
            ].map(([label, value]) => (
              <div key={label} className="min-w-0 rounded-2xl bg-[#f4f6f1] p-3">
                <p className="text-xs font-bold text-[#7b847e]">{label}</p>
                <p className="mt-1 truncate text-sm font-semibold">{value}</p>
              </div>
            ))}
          </div>
          <section className="mt-3 rounded-2xl bg-[#f4f6f1] p-4">
            <h2 className="text-sm font-bold text-[#245b46]">这次这样玩</h2>
            <div className="mt-2 space-y-1 text-sm leading-6 text-[#65706a]">{friendlyWhy(plan,input).map(line=><p key={line}>{line}</p>)}</div>
          </section>
          {priorities.length > 0 && (
            <p className="mt-3 text-xs text-[#707a74]">
              重点：{priorities.join(" · ")}
            </p>
          )}
        </div>
      </section>
      {(notice?.length || canUndo) && (
        <div className="page-shell mt-6 flex flex-col gap-3 rounded-2xl bg-[#eaf2ed] p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-bold text-[#245b46]">
              {canUndo ? "已调整当天行程" : "行程已恢复"}
            </p>
            <p className="mt-1 text-sm text-[#53635b]">
              {notice?.join("；") || "最近一次修改已保存。"}
            </p>
          </div>
          {canUndo && onUndo && (
            <button
              onClick={onUndo}
              className="rounded-full border bg-white px-4 py-2 text-sm font-bold text-[#245b46]"
            >
              还是用刚才的安排
            </button>
          )}
        </div>
      )}
      <div className="page-shell mt-8 space-y-6">
        <IntercitySummary input={input}/>
        {plan.days.map((day) => (
          <article
            key={day.dayNumber}
            className="card overflow-hidden rounded-3xl"
          >
            <header className="border-b border-black/5 p-5 sm:p-7">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-bold text-[#287057]">
                    DAY {day.dayNumber}
                    {day.date ? ` · ${day.date}` : ""}
                  </p>
                  <h2 className="mt-2 text-2xl font-bold">{day.title}</h2>
                  <p className="mt-1 font-medium text-[#526159]">今天：{day.theme}</p>
                </div>
              </div>
            </header>
            <div className="p-5 sm:p-7">
              <DayRoute day={day} />
              {day.activities.map((activity, index) => (
                <div
                  id={`activity-${day.dayNumber}-${activity.id}`}
                  key={activity.id}
                  className={`relative flex scroll-mt-24 gap-4 rounded-xl pb-8 transition-colors duration-700 last:pb-0 ${highlightedActivityIds.includes(activity.id) ? "bg-[#fff5cf] px-3 pt-3" : ""}`}
                >
                  <div className="flex w-12 shrink-0 flex-col items-center">
                    <span className="text-xs font-bold text-[#287057]">
                      {activity.startTime}
                    </span>
                    {index < day.activities.length - 1 && (
                      <span className="mt-2 h-full w-px bg-[#dbe4de]" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <h3 className="font-bold">{activity.name}</h3>
                      <span className="text-xs text-[#7b847e]">
                        {activity.area}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#526159]">
                      <span>停留时间：<strong className="text-[#26352e]">{stayLabel(activity.durationMinutes)}</strong></span>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-[#65706a]">
                      {friendlyReason(activity.reason)}
                    </p>
                    {activity.transportToNext && (
                      <p className="mt-3 rounded-xl bg-[#f2f5f0] px-3 py-2 text-xs text-[#566159]">
                        <strong className="text-[#38453f]">下一站：</strong><strong>{method[activity.transportToNext.method]}约 {activity.transportToNext.durationMinutes} 分钟</strong> → {activity.transportToNext.description}
                      </p>
                    )}
                  </div>
                </div>
              ))}
              <div className="mt-5 space-y-3 border-t border-black/5 pt-4 text-sm leading-6 text-[#65706a]">
                <p>今天主要玩：<strong className="text-[#26352e]">{dayAreas(plan.destination.city,summarizeDayRoute(day).areas)}</strong></p>
                <p>交通方式：<strong className="text-[#26352e]">{summarizeDayRoute(day).transport}</strong></p>
                <p>预计：<strong className="text-[#26352e]">{summarizeDayRoute(day).walking}{day.estimatedCost !== null ? `，花费约 ¥${day.estimatedCost}` : ""}</strong></p>
              </div>
              <div className="mt-4 flex justify-end">
                <DayImageExport
                  day={day}
                  destination={plan.destination.city}
                  tripTitle={displayTripTitle(input)}
                  tripId={tripId}
                />
              </div>
              <div className="mt-5 rounded-2xl bg-[#fff7e9] p-4">
                <p className="text-sm font-bold text-[#9a6223]">出发前知道</p>
                <ul className="mt-2 space-y-1 text-sm leading-6 text-[#785f41]">
                  {day.dayTips.slice(0,3).map((tip) => (
                    <li key={tip}>· {tip}</li>
                  ))}
                </ul>
              </div>
              {tripId && (
                <DayFeedback
                  tripId={tripId}
                  dayNumber={day.dayNumber}
                  action={onReviseDay ? (
                    <button
                      type="button"
                      onClick={() => onReviseDay(day)}
                      className="min-h-11 rounded-full border border-black/10 bg-white px-3 py-2 text-sm font-semibold text-[#245b46]"
                    >
                      调整这一天
                    </button>
                  ) : undefined}
                />
              )}
            </div>
          </article>
        ))}
        {tripId && (
          <section className="rounded-3xl border border-[#245b46]/15 bg-[#eaf2ed] p-6 text-center">
            <h2 className="text-xl font-bold text-[#204f3c]">
              分享这份旅行计划
            </h2>
            <p className="mt-2 text-sm text-[#65706a]">
              复制链接给同行人；对方只能查看。
            </p>
            <button
              onClick={share}
              className="mt-4 rounded-full bg-[#245b46] px-6 py-3 text-sm font-bold text-white"
            >
              {copied ? "分享链接已准备好" : "分享这份旅行计划"}
            </button>
          </section>
        )}
        <div className="grid gap-5 md:grid-cols-3">
          <section className="card rounded-3xl p-6">
            <h2 className="font-bold">住在哪里</h2>
            <p className="mt-3 text-lg font-bold text-[#245b46]">
              {plan.strategy.recommendedStayArea}
            </p>
            <p className="mt-2 text-sm leading-6 text-[#65706a]">
              {plan.strategy.stayReason}
            </p>
          </section>
          <section className="card rounded-3xl p-6">
            <h2 className="font-bold">预算概览</h2>
            <strong className="mt-4 block text-xl">{budgetLabel}</strong>
            <p className="mt-3 text-xs leading-5 text-[#7b847e]">
              {formatDisplayText(plan.budget.notes)}
            </p>
          </section>
          <section className="rounded-3xl bg-[#f0e4cd] p-6">
            <h2 className="font-bold">出发前确认</h2>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-[#63553f]">
              {plan.generalTips.map((tip) => (
                <li key={tip}>· {tip}</li>
              ))}
            </ul>
          </section>
        </div>
      </div>
      <p className="page-shell mt-8 text-center text-xs leading-5 text-[#858d88]">
        {plan.dataDisclaimer}
      </p>
    </main>
  );
}
