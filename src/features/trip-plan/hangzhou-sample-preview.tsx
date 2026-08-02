"use client";
import { useState } from "react";
import type { DayPlan } from "@/types/trip";
import { hangzhouSample } from "./hangzhou-sample";
import { DayRoute } from "./day-route";
import {AppIcon} from "@/components/app-icons";

function sampleRoute(
  day: (typeof hangzhouSample.days)[number],
): Pick<DayPlan, "dayNumber" | "activities"> {
  const names = day.route.split(" → ");
  return {
    dayNumber: day.day,
    activities: names.map((name, index) => ({
      id: `sample-${day.day}-${index}`,
      type: "attraction" as const,
      startTime: "10:00",
      endTime: "11:00",
      name,
      area: day.area,
      reason: "示例路线",
      durationMinutes: 60,
      estimatedCost: null,
      transportToNext:
        index === names.length - 1
          ? null
          : {
              method: day.transport,
              durationMinutes: day.transportMinutes[index] || 15,
              description: "前往下一站",
            },
      tips: [],
      photoTips: [],
    })),
  };
}
export function HangzhouSamplePreview() {
  const [expanded, setExpanded] = useState(false);
  function back() {
    document.getElementById("plan")?.scrollIntoView({ behavior: "smooth" });
    setTimeout(
      () =>
        document
          .getElementById("trip-destination")
          ?.focus({ preventScroll: true }),
      450,
    );
  }
  return (
    <section id="sample-trip" className="mt-7 scroll-mt-24" aria-labelledby="sample-title">
      <h2 id="sample-title" className="sr-only">杭州三日安排示例</h2>
      <div className="app-card-primary overflow-hidden">
        <header className="relative overflow-hidden border-b border-[var(--border-soft)] bg-white p-5 sm:p-8">
          <span className="icon-bubble is-warm absolute right-5 top-5"><AppIcon name="route"/></span>
          <p className="text-sm font-semibold text-[var(--brand-primary)]">杭州 · 3天</p>
          <h3 className="mt-2 pr-14 text-2xl font-bold text-[var(--text-strong)]">{hangzhouSample.title}</h3>
          <div className="mt-3 flex flex-wrap gap-3 text-sm text-[var(--text-secondary)]">
            <span>{hangzhouSample.style}</span>
            <span>{hangzhouSample.priorities.join("、")}</span>
          </div>
        </header>
        <div className="p-5 sm:p-8">
          <DayRoute day={sampleRoute(hangzhouSample.days[0])} />
          {!expanded&&<div className="mt-5 grid gap-2 sm:grid-cols-3">{hangzhouSample.days.map(day=><div key={day.day} className="rounded-2xl bg-[var(--background-soft)] p-3"><strong className="text-xs text-[var(--brand-primary)]">DAY {day.day}</strong><p className="mt-1 text-sm font-semibold">{day.route.split(" → ").slice(0,3).join(" → ")}</p></div>)}</div>}
          {expanded && (
            <div className="mt-6 space-y-4 border-t pt-6">
              {hangzhouSample.days.map((day) => (
                <article
                  key={day.day}
                  className="rounded-2xl border border-black/7 p-4"
                >
                  <p className="text-xs font-bold text-[#287057]">
                    DAY {day.day}
                  </p>
                  <h4 className="mt-2 text-lg font-bold">{day.title}</h4>
                  <div className="mt-4">
                    <DayRoute day={sampleRoute(day)} />
                  </div>
                  <p className="text-sm leading-6 text-[#707a74]">
                    {day.detail}
                  </p>
                </article>
              ))}
            </div>
          )}
          <button
            onClick={() => setExpanded((value) => !value)}
            className="btn-secondary mt-6 w-full px-5 py-3 text-sm"
          >
            {expanded ? "收起示例" : "查看完整三日示例"}
          </button>
          <button
            onClick={back}
            className="btn-primary mt-3 w-full px-5 py-3 text-sm"
          >
            按这样的方式规划我的旅行
          </button>
        </div>
      </div>
    </section>
  );
}
