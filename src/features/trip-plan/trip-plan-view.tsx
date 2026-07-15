"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import type { DayPlan, TripInput, TripPlan } from "@/types/trip";
import { priorityOptions, travelStyles } from "@/features/trip-input/options";
import { DayFeedback } from "@/features/feedback/day-feedback";
import {
  formatDisplayText,
  formatDisplayValue,
  formatPriority,
} from "./display-formatters";
import { DayImageExport } from "./day-image-export";
import { DayRoute } from "./day-route";
import { trackEvent } from "@/features/analytics/client";

const intensity = { easy: "轻松", moderate: "适中", intense: "充实" };
const method = {
  walk: "步行",
  public_transport: "公共交通",
  taxi: "打车",
  mixed: "组合交通",
};
const mainTypes = new Set(["attraction", "shopping", "entertainment"]);
const companionLabel: Record<TripInput["companionType"], string> = {
  solo: "一个人",
  friends: "朋友",
  couple: "情侣",
  parents: "父母",
  with_children: "带娃",
  extended_family: "一大家人",
};

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
    const methods = plan.days.flatMap((day) =>
      day.activities
        .map((activity) => activity.transportToNext?.method)
        .filter(Boolean),
    );
    const transport = methods.length
      ? methods.sort(
          (a, b) =>
            methods.filter((value) => value === b).length -
            methods.filter((value) => value === a).length,
        )[0]!
      : "mixed";
    return {
      mainActivities: `${Math.min(...counts)}–${Math.max(...counts)}个/天`,
      walking: walking <= 4 ? "较少" : walking <= 7 ? "适中" : "较多",
      transport: method[transport as keyof typeof method],
    };
  }, [plan]);
  const style = travelStyles.find((item) => item.value === input.travelStyle);
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
          title: plan.title,
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
            {plan.title}
          </p>
        </div>
      </section>
      <section className="page-shell mt-6">
        <div className="card rounded-3xl p-5 sm:p-8">
          <p className="text-sm font-bold text-[#287057]">
            这份计划为你这样安排
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {[
              [
                "旅行节奏",
                style?.label || formatDisplayValue(input.travelStyle),
              ],
              ["同行方式", companionLabel[input.companionType]],
              ["每天活动", understanding.mainActivities],
              [
                "出门时间",
                input.preferredDepartureTime ||
                  (input.travelStyle === "lazy" ? "10:00后" : "灵活安排"),
              ],
              ["步行强度", understanding.walking],
              ["主要交通", formatDisplayValue(understanding.transport)],
            ].map(([label, value]) => (
              <div key={label} className="min-w-0 rounded-2xl bg-[#f4f6f1] p-3">
                <p className="text-xs font-bold text-[#7b847e]">{label}</p>
                <p className="mt-1 truncate text-sm font-semibold">{value}</p>
              </div>
            ))}
          </div>
          <details className="mt-3 rounded-2xl bg-[#f4f6f1] p-4">
            <summary className="cursor-pointer text-sm font-bold text-[#245b46]">
              为什么这样安排
            </summary>
            <p className="mt-2 text-sm leading-6 text-[#65706a]">
              {plan.summary}
            </p>
          </details>
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
                  <p className="mt-1 text-[#6f7973]">{day.theme}</p>
                </div>
                {onReviseDay && (
                  <button
                    onClick={() => onReviseDay(day)}
                    className="rounded-full border bg-white px-4 py-2 text-sm font-semibold text-[#245b46]"
                  >
                    今天不满意？告诉我怎么改
                  </button>
                )}
              </div>
              <div className="mt-5 flex flex-wrap gap-4 text-xs font-semibold text-[#65706a]">
                <span>强度：{intensity[day.intensity]}</span>
                <span>步行约 {day.estimatedWalkingKm} km</span>
                {day.estimatedCost !== null && (
                  <span>预计 ¥{day.estimatedCost}</span>
                )}
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
                        {activity.area} · {activity.durationMinutes}分钟
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-[#65706a]">
                      {activity.reason}
                    </p>
                    {activity.transportToNext && (
                      <p className="mt-3 rounded-xl bg-[#f2f5f0] px-3 py-2 text-xs text-[#566159]">
                        下一站：{method[activity.transportToNext.method]}约{" "}
                        {activity.transportToNext.durationMinutes} 分钟 ·{" "}
                        {activity.transportToNext.description}
                      </p>
                    )}
                  </div>
                </div>
              ))}
              <div className="mt-4 flex justify-end">
                <DayImageExport
                  day={day}
                  destination={plan.destination.city}
                  tripTitle={plan.title}
                  tripId={tripId}
                />
              </div>
              <div className="mt-5 rounded-2xl bg-[#fff7e9] p-4">
                <p className="text-sm font-bold text-[#9a6223]">今日提醒</p>
                <ul className="mt-2 space-y-1 text-sm leading-6 text-[#785f41]">
                  {day.dayTips.map((tip) => (
                    <li key={tip}>· {tip}</li>
                  ))}
                </ul>
              </div>
              {tripId && (
                <DayFeedback tripId={tripId} dayNumber={day.dayNumber} />
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
