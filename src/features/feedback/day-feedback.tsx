"use client";

import { useState } from "react";
import { trackEvent } from "@/features/analytics/client";

const choices = [["just_right","刚刚好"], ["too_full","太满了"], ["too_empty","太空了"], ["bad_route","路线不顺"], ["preference_mismatch","不够符合兴趣"]] as const;

export function DayFeedback({ tripId, dayNumber }: { tripId: string; dayNumber: number }) {
  const [open,setOpen] = useState(false); const [selected,setSelected] = useState<typeof choices[number][0]>(); const [comment,setComment] = useState(""); const [status,setStatus] = useState<"idle"|"saving"|"saved"|"error">("idle");
  async function submit() {
    if (!selected || status === "saving") return; setStatus("saving");
    try { const response = await fetch(`/api/trips/${tripId}/feedback`, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ rating: selected === "just_right" ? "helpful" : "usable", issueTags: selected === "just_right" ? [] : [selected], comment:`第${dayNumber}天反馈${comment.trim() ? `｜${comment.trim()}` : ""}` }) }); setStatus(response.ok ? "saved" : "error"); if (response.ok) { trackEvent("feedback_submitted",{pageName:"trip",tripId,metadata:{kind:"day"}}); setOpen(false); } }
    catch { setStatus("error"); }
  }
  return <div className="mt-5 border-t border-black/5 pt-4"><button type="button" aria-expanded={open} onClick={() => setOpen((value) => !value)} className="inline-flex min-h-10 items-center gap-2 rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-[#245b46]"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className={`h-4 w-4 transition-transform motion-reduce:transition-none ${open ? "rotate-180" : ""}`}><path d="m7 9 5 5 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>{status === "saved" ? "已评价" : "评价这一天"}</button>{open && <div className="mt-3 rounded-2xl bg-[#f7f8f4] p-4 motion-safe:animate-[fade-in_.2s_ease-out]"><p className="text-sm font-bold">这一天安排得怎么样？</p><div className="mt-3 flex flex-wrap gap-2">{choices.map(([value,label]) => <button type="button" key={value} aria-pressed={selected === value} onClick={() => { setSelected(value); setStatus("idle"); }} className={`rounded-full border px-3 py-2 text-xs font-semibold ${selected === value ? "border-[#245b46] bg-[#eaf2ed] text-[#245b46]" : "border-black/10 bg-white"}`}>{label}</button>)}</div><textarea value={comment} maxLength={240} onChange={(event) => setComment(event.target.value)} className="mt-3 min-h-20 w-full resize-y rounded-xl border border-black/10 bg-white p-3 text-sm" placeholder="还想补充什么？（选填）"/><div className="mt-3 flex items-center justify-between gap-3"><p className="text-xs text-[#65706a]">{status === "error" ? "保存失败，请重试" : status === "saving" ? "保存中…" : ""}</p><button type="button" disabled={!selected || status === "saving"} onClick={submit} className="rounded-full bg-[#245b46] px-4 py-2 text-sm font-bold text-white disabled:opacity-40">提交评价</button></div></div>}</div>;
}
