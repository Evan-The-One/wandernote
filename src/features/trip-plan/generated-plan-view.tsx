"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { tripInputSchema, tripPlanSchema } from "@/schemas/trip";
import type { DayPlan, TripInput, TripPlan } from "@/types/trip";
import { TripPlanView } from "./trip-plan-view";
import { DayRevisionPanel } from "@/features/day-revision/day-revision-panel";
import { BetaFeedback } from "@/features/feedback/beta-feedback";

type TripPayload = { tripId: string; status: string; input: TripInput; plan: TripPlan | null; version: number; canEdit: boolean; canUndo: boolean; error?: { message?: string } };

export function GeneratedPlanView({ tripId }: { tripId: string }) {
  const [data, setData] = useState<TripPayload | null>(null); const [error, setError] = useState("");
  const [revisionDay, setRevisionDay] = useState<DayPlan | null>(null); const [notice, setNotice] = useState<string[] | undefined>(); const [undoing, setUndoing] = useState(false);
  const load = useCallback(async () => {
    try {
      const response = await fetch(`/api/trips/${tripId}`, { cache: "no-store" }); const payload = await response.json() as TripPayload;
      if (!response.ok) throw new Error(payload.error?.message || "无法读取这份攻略");
      const input = tripInputSchema.parse(payload.input); const plan = payload.plan ? tripPlanSchema.parse(payload.plan) : null;
      setData({ ...payload, input, plan });
      if (plan) { localStorage.setItem(`wandernote:trip:${tripId}`, JSON.stringify({ input, plan, version: payload.version })); localStorage.setItem("wandernote:recent-trip-id", tripId); }
    } catch (cause) {
      try { const cached = JSON.parse(localStorage.getItem(`wandernote:trip:${tripId}`) || "null") as { input?: unknown; plan?: unknown; version?: number } | null; const input = tripInputSchema.safeParse(cached?.input); const plan = tripPlanSchema.safeParse(cached?.plan); if (input.success && plan.success) { setData({ tripId, status: "completed", input: input.data, plan: plan.data, version: cached?.version || 1, canEdit: false, canUndo: false }); setError("网络暂时不可用，当前显示浏览器缓存，只读模式下不会覆盖服务器数据。"); return; } } catch { /* ignore invalid cache */ }
      setError(cause instanceof Error ? cause.message : "无法读取这份攻略");
    }
  }, [tripId]);
  useEffect(() => { queueMicrotask(() => void load()); }, [load]);

  async function undo() {
    if (!data?.plan) return; setUndoing(true);
    try { const response = await fetch(`/api/trips/${tripId}/undo-day`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ version: data.version }) }); const payload = await response.json() as { plan?: unknown; version?: number; error?: { message?: string } }; if (!response.ok) throw new Error(payload.error?.message || "撤销失败"); const plan = tripPlanSchema.parse(payload.plan); setData({ ...data, plan, version: payload.version!, canUndo: false }); setNotice(["已恢复修改前的当天行程"]); localStorage.setItem(`wandernote:trip:${tripId}`, JSON.stringify({ input: data.input, plan, version: payload.version })); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "撤销失败"); } finally { setUndoing(false); }
  }

  if (!data) return <main className="page-shell flex min-h-[70vh] items-center justify-center"><div className="text-center">{error ? <><h1 className="text-2xl font-bold">暂时无法打开这份计划</h1><p className="mt-3 text-[#65706a]">{error}</p><Link href="/#plan" className="mt-6 inline-block rounded-full bg-[#245b46] px-6 py-3 font-semibold text-white">换个玩法重新安排</Link></> : <div className="h-9 w-9 animate-spin rounded-full border-4 border-[#245b46]/20 border-t-[#245b46]" />}</div></main>;
  if (!data.plan) return <main className="page-shell flex min-h-[70vh] items-center justify-center"><div className="text-center"><h1 className="text-2xl font-bold">攻略还在准备中</h1><p className="mt-3 text-[#65706a]">状态：{data.status}</p></div></main>;
  return <>{error && <div className="page-shell mt-4 rounded-2xl bg-[#fff7e9] p-4 text-sm text-[#785f41]">{error}</div>}<TripPlanView plan={data.plan} input={data.input} onReviseDay={data.canEdit ? setRevisionDay : undefined} notice={notice} canUndo={data.canEdit && data.canUndo} onUndo={undoing ? undefined : undo} canEdit={data.canEdit} tripId={tripId} /><BetaFeedback tripId={tripId} /><div className="page-shell -mt-10 mb-20 text-center"><Link href="/#plan" className="inline-flex rounded-full border border-[#245b46]/20 bg-white px-5 py-2.5 text-sm font-bold text-[#245b46]">换个玩法重新安排</Link></div>{revisionDay && <DayRevisionPanel tripId={tripId} day={revisionDay} version={data.version} onClose={() => setRevisionDay(null)} onSuccess={(plan, version, summary) => { setData({ ...data, plan, version, canUndo: true }); setNotice(summary); setRevisionDay(null); localStorage.setItem(`wandernote:trip:${tripId}`, JSON.stringify({ input: data.input, plan, version })); }} />}</>;
}
