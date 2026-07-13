"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { tripPlanSchema } from "@/schemas/trip";
import { migrateTripInput } from "@/schemas/migration";
import type { DayPlan, TripInput, TripPlan } from "@/types/trip";
import { TripPlanView } from "./trip-plan-view";
import { DayRevisionPanel } from "@/features/day-revision/day-revision-panel";

type UndoSnapshot = { dayNumber: number; day: DayPlan; budget: TripPlan["budget"] };

function parseUndo(raw: string | null): UndoSnapshot | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as UndoSnapshot;
    return value?.day && typeof value.dayNumber === "number" && value.budget ? value : null;
  } catch { return null; }
}

export function GeneratedPlanView() {
  const [plan, setPlan] = useState<TripPlan | null>(null);
  const [input, setInput] = useState<TripInput | null>(null);
  const [missing, setMissing] = useState(false);
  const [revisionDay, setRevisionDay] = useState<DayPlan | null>(null);
  const [undo, setUndo] = useState<UndoSnapshot | null>(null);
  const [notice, setNotice] = useState<string[] | undefined>();

  useEffect(() => {
    try {
      const rawPlan = window.localStorage.getItem("wandernote:generated-plan");
      const rawInput = window.localStorage.getItem("wandernote:demo-input");
      const parsedPlan = rawPlan ? tripPlanSchema.safeParse(JSON.parse(rawPlan)) : null;
      const parsedInput = rawInput ? migrateTripInput(JSON.parse(rawInput)) : null;
      if (!parsedPlan?.success || !parsedInput) { queueMicrotask(() => setMissing(true)); return; }
      const storedUndo = parseUndo(window.localStorage.getItem("wandernote:last-undo"));
      queueMicrotask(() => { setPlan(parsedPlan.data); setInput(parsedInput); setUndo(storedUndo); });
    } catch { queueMicrotask(() => setMissing(true)); }
  }, []);

  function applyRevision(updatedDay: DayPlan, summary: string[]) {
    if (!plan) return;
    const previousDay = plan.days.find((day) => day.dayNumber === updatedDay.dayNumber);
    if (!previousDay) return;
    const snapshot: UndoSnapshot = { dayNumber: previousDay.dayNumber, day: previousDay, budget: plan.budget };
    const updatedDailyTotal = plan.budget.dailyCostTotal !== null && previousDay.estimatedCost !== null && updatedDay.estimatedCost !== null
      ? plan.budget.dailyCostTotal - previousDay.estimatedCost + updatedDay.estimatedCost : plan.budget.dailyCostTotal;
    const updatedBudget = plan.budget.mode === "custom" && plan.budget.estimatedTotal !== null && updatedDailyTotal !== null
      ? { ...plan.budget, dailyCostTotal: updatedDailyTotal, unallocatedCost: plan.budget.estimatedTotal - updatedDailyTotal, unallocatedExplanation: plan.budget.estimatedTotal - updatedDailyTotal > 0 ? "原计划机动预算与本次调整后释放的当天预算，用于住宿、交通或临时支出。" : null }
      : plan.budget;
    const updatedPlan = { ...plan, days: plan.days.map((day) => day.dayNumber === updatedDay.dayNumber ? updatedDay : day), budget: updatedBudget, updatedAt: new Date().toISOString() };
    setPlan(updatedPlan); setUndo(snapshot); setNotice(summary); setRevisionDay(null);
    window.localStorage.setItem("wandernote:generated-plan", JSON.stringify(updatedPlan));
    window.localStorage.setItem("wandernote:last-undo", JSON.stringify(snapshot));
  }

  function undoRevision() {
    if (!plan || !undo) return;
    const restored = { ...plan, days: plan.days.map((day) => day.dayNumber === undo.dayNumber ? undo.day : day), budget: undo.budget, updatedAt: new Date().toISOString() };
    setPlan(restored); setUndo(null); setNotice(["已恢复修改前的当天行程"]);
    window.localStorage.setItem("wandernote:generated-plan", JSON.stringify(restored));
    window.localStorage.removeItem("wandernote:last-undo");
  }

  if (missing) return <main className="page-shell flex min-h-[70vh] items-center justify-center"><div className="text-center"><h1 className="text-2xl font-bold">还没有生成攻略</h1><p className="mt-3 text-[#65706a]">先告诉旅行管家你的目的地和偏好。</p><Link href="/create" className="mt-6 inline-block rounded-full bg-[#245b46] px-6 py-3 font-semibold text-white">开始规划</Link></div></main>;
  if (!plan || !input) return <main className="page-shell flex min-h-[70vh] items-center justify-center"><div className="h-9 w-9 animate-spin rounded-full border-4 border-[#245b46]/20 border-t-[#245b46]" /></main>;
  return <><TripPlanView plan={plan} onReviseDay={setRevisionDay} notice={notice} canUndo={Boolean(undo)} onUndo={undoRevision} />{revisionDay && <DayRevisionPanel day={revisionDay} plan={plan} input={input} onClose={() => setRevisionDay(null)} onSuccess={applyRevision} />}</>;
}
