"use client";

import { useEffect, useState } from "react";
import { tripPlanSchema } from "@/schemas/trip";
import type { DayPlan, TripPlan } from "@/types/trip";

const quickOptions = ["今天太累了", "不想早起", "少走一点", "想吃得更好", "换个小众地方", "增加拍照地点", "换成室内活动", "下午留空休息", "把这个景点换掉", "下雨的话怎么安排"];

export function DayRevisionPanel({ tripId, day, version, onClose, onSuccess }: { tripId: string; day: DayPlan; version: number; onClose: () => void; onSuccess: (plan: TripPlan, version: number, summary: string[]) => void }) {
  const [instruction, setInstruction] = useState(""); const [loading, setLoading] = useState(false); const [seconds, setSeconds] = useState(0); const [error, setError] = useState("");
  useEffect(() => { if (!loading) return; const timer = window.setInterval(() => setSeconds((value) => value + 1), 1000); return () => window.clearInterval(timer); }, [loading]);
  useEffect(() => { if (!loading) return; const beforeUnload = (event: BeforeUnloadEvent) => event.preventDefault(); window.addEventListener("beforeunload", beforeUnload); return () => window.removeEventListener("beforeunload", beforeUnload); }, [loading]);
  async function submit() {
    const normalized = instruction.trim(); if (normalized.length < 3) { setError("请描述你希望怎样调整这一天"); return; }
    setLoading(true); setError(""); setSeconds(0);
    try { const response = await fetch(`/api/trips/${tripId}/revise-day`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ targetDayNumber: day.dayNumber, instruction: normalized, version }) }); const payload = await response.json() as { plan?: unknown; version?: number; changeSummary?: string[]; error?: { message?: string } }; if (!response.ok) throw new Error(payload.error?.message || "无法完成调整，原行程没有变化"); onSuccess(tripPlanSchema.parse(payload.plan), payload.version!, payload.changeSummary || []); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "无法完成调整，原行程没有变化"); } finally { setLoading(false); }
  }
  return <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/35 sm:items-center sm:p-5" role="dialog" aria-modal="true"><div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-[2rem] bg-[#f8f8f3] p-5 shadow-2xl sm:rounded-[2rem] sm:p-7"><div className="flex items-start justify-between gap-4"><div><p className="text-sm font-bold text-[#287057]">DAY {day.dayNumber}{day.date ? ` · ${day.date}` : ""}</p><h2 className="mt-1 text-2xl font-bold">今天不满意？告诉我怎么改</h2><p className="mt-1 text-sm text-[#707a74]">{day.theme}</p></div><button disabled={loading} onClick={onClose} className="rounded-full border border-black/10 px-3 py-1.5 text-sm font-bold disabled:opacity-40">关闭</button></div>{loading ? <div className="py-12 text-center"><div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-[#245b46]/20 border-t-[#245b46]" /><h3 className="mt-5 text-lg font-bold">正在重新安排第{day.dayNumber}天</h3><p className="mt-2 text-sm text-[#65706a]">其他日期不会改变 · 已等待 {seconds} 秒</p></div> : <><div className="mt-6 flex flex-wrap gap-2">{quickOptions.map((option) => <button key={option} type="button" onClick={() => setInstruction((value) => value ? `${value}；${option}` : option)} className="rounded-full border border-black/10 bg-white px-3 py-2 text-sm font-semibold">{option}</button>)}</div><label className="mt-5 block font-semibold">你希望今天怎么变？<textarea value={instruction} onChange={(event) => setInstruction(event.target.value)} maxLength={500} className="focus-ring mt-2 min-h-32 w-full resize-y rounded-2xl border border-black/10 bg-white p-4 font-normal" /></label>{error && <p className="mt-4 rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</p>}<button onClick={submit} className="mt-5 w-full rounded-full bg-[#245b46] px-6 py-3.5 font-bold text-white">重新安排今天</button></>}</div></div>;
}
