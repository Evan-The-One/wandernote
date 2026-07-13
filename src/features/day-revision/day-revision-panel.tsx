"use client";

import { useEffect, useState } from "react";
import { dayRevisionResponseSchema } from "@/schemas/trip";
import type { DayPlan, DayRevisionRequest, TripInput, TripPlan } from "@/types/trip";

const quickOptions = ["轻松一点", "减少步行", "增加美食", "增加拍照地点", "换成室内活动", "避开热门景点", "删除一个活动", "不要太早出发"];

function adjacent(day: DayPlan | undefined) {
  if (!day) return null;
  const first = day.activities[0];
  const last = day.activities[day.activities.length - 1];
  return { dayNumber: day.dayNumber, date: day.date, title: day.title, lastActivityEndTime: last?.endTime ?? null, lastActivityArea: last?.area ?? null, firstActivityStartTime: first?.startTime ?? null, firstActivityArea: first?.area ?? null };
}

export function DayRevisionPanel({ day, plan, input, onClose, onSuccess }: { day: DayPlan; plan: TripPlan; input: TripInput; onClose: () => void; onSuccess: (updatedDay: DayPlan, summary: string[]) => void }) {
  const [instruction, setInstruction] = useState("");
  const [loading, setLoading] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!loading) return;
    const timer = window.setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, [loading]);

  useEffect(() => {
    if (!loading) return;
    const beforeUnload = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [loading]);

  function addQuickOption(option: string) {
    setInstruction((current) => current ? `${current}；${option}` : option);
  }

  async function submit() {
    const normalized = instruction.trim();
    if (normalized.length < 3) { setError("请描述你希望怎样调整这一天"); return; }
    setLoading(true); setError(""); setSeconds(0);
    const index = plan.days.findIndex((item) => item.dayNumber === day.dayNumber);
    const request: DayRevisionRequest = {
      schemaVersion: "0.2", originalInput: input, strategy: plan.strategy, budget: plan.budget,
      targetDayNumber: day.dayNumber, currentDay: day, previousDay: adjacent(plan.days[index - 1]), nextDay: adjacent(plan.days[index + 1]),
      otherDaysCostTotal: input.budget.mode === "custom" ? plan.days.reduce((sum, item) => item.dayNumber === day.dayNumber ? sum : sum + (item.estimatedCost ?? 0), 0) : null,
      instruction: normalized,
    };
    try {
      const response = await fetch("/api/trips/revise-day", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(request) });
      const payload = await response.json() as { data?: unknown; error?: { message?: string } };
      if (!response.ok) throw new Error(payload.error?.message || "无法完成调整，原行程没有变化");
      const result = dayRevisionResponseSchema.parse(payload.data);
      onSuccess(result.updatedDay, result.changeSummary);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "无法完成调整，原行程没有变化"); }
    finally { setLoading(false); }
  }

  return <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/35 p-0 sm:items-center sm:p-5" role="dialog" aria-modal="true" aria-label={`调整第${day.dayNumber}天`}>
    <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-[2rem] bg-[#f8f8f3] p-5 shadow-2xl sm:rounded-[2rem] sm:p-7">
      <div className="flex items-start justify-between gap-4"><div><p className="text-sm font-bold text-[#287057]">DAY {day.dayNumber}{day.date ? ` · ${day.date}` : ""}</p><h2 className="mt-1 text-2xl font-bold">调整这一天</h2><p className="mt-1 text-sm text-[#707a74]">{day.theme}</p></div><button disabled={loading} onClick={onClose} className="rounded-full border border-black/10 px-3 py-1.5 text-sm font-bold disabled:opacity-40">关闭</button></div>
      {loading ? <div className="py-12 text-center"><div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-[#245b46]/20 border-t-[#245b46]" /><h3 className="mt-5 text-lg font-bold">正在重新安排第{day.dayNumber}天</h3><p className="mt-2 text-sm text-[#65706a]">AI正在检查时间、交通和强度，其他日期不会改变。</p><p className="mt-4 text-sm font-bold text-[#245b46]">已等待 {seconds} 秒</p></div> : <>
        <div className="mt-6 flex flex-wrap gap-2">{quickOptions.map((option) => <button key={option} type="button" onClick={() => addQuickOption(option)} className="rounded-full border border-black/10 bg-white px-3 py-2 text-sm font-semibold hover:border-[#245b46]/50">{option}</button>)}</div>
        <label className="mt-5 block font-semibold">告诉旅行管家你的想法<textarea value={instruction} onChange={(event) => setInstruction(event.target.value)} maxLength={500} className="focus-ring mt-2 min-h-32 w-full resize-y rounded-2xl border border-black/10 bg-white p-4 font-normal" placeholder="例如：下午少安排一个景点，增加午休，路线尽量集中……" /></label>
        {error && <p role="alert" className="mt-4 rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</p>}
        <button type="button" onClick={submit} className="mt-5 w-full rounded-full bg-[#245b46] px-6 py-3.5 font-bold text-white">确认调整</button>
        <p className="mt-3 text-center text-xs text-[#7b847e]">修改失败时会保留原行程，不会写入不合格结果。</p>
      </>}
    </div>
  </div>;
}
