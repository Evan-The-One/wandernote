"use client";

import { useEffect, useState } from "react";

export function PlanningProgress({ steps, active = true, intervalMs = 7000, compact = false }: { steps: string[]; active?: boolean; intervalMs?: number; compact?: boolean }) {
  const [current, setCurrent] = useState(0);
  useEffect(() => {
    if (!active) { queueMicrotask(() => setCurrent(0)); return; }
    const timer = window.setInterval(() => setCurrent((value) => Math.min(value + 1, steps.length - 1)), intervalMs);
    return () => window.clearInterval(timer);
  }, [active, intervalMs, steps.length]);
  return <div className={compact ? "mt-6 space-y-2 text-left" : "mt-7 space-y-2 text-left"} aria-live="polite">{steps.slice(0, current + 1).map((label, index) => <div key={label} className={`planning-step flex items-center gap-3 rounded-2xl border p-3.5 ${index < current ? "border-[#245b46]/15 bg-white text-[#425149]" : "planning-step-active border-[#245b46]/25 bg-white text-[#24332c]"}`}><span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full ${index < current ? "bg-[#245b46] text-white" : "bg-[#dfece4]"}`}>{index < current ? <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="h-4 w-4"><path d="m5 10 3 3 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg> : <span aria-hidden="true" className="planning-dot h-2 w-2 rounded-full bg-[#245b46]" />}</span><span className="font-semibold">{label}</span></div>)}</div>;
}
