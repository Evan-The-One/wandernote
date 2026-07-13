"use client";

import { useState } from "react";

const choices = [
  ["just_right","刚刚好"], ["too_full","太满了"], ["too_empty","太空了"],
  ["bad_route","路线不顺"], ["preference_mismatch","不够符合兴趣"],
] as const;

export function DayFeedback({ tripId, dayNumber }: { tripId: string; dayNumber: number }) {
  const [selected,setSelected] = useState<string>(); const [status,setStatus] = useState("");
  async function send(value: typeof choices[number][0]) {
    setSelected(value); setStatus("保存中…");
    try {
      const rating = value === "just_right" ? "helpful" : "usable";
      const issueTags = value === "just_right" ? [] : [value];
      const response = await fetch(`/api/trips/${tripId}/feedback`, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ rating, issueTags, comment:`第${dayNumber}天反馈` }) });
      setStatus(response.ok ? "已记下" : "保存失败，请重试");
    } catch { setStatus("网络不可用，请稍后重试"); }
  }
  return <div className="mt-5 border-t border-black/5 pt-5"><p className="text-sm font-bold">这一天安排得怎么样？</p><div className="mt-3 flex flex-wrap gap-2">{choices.map(([value,label]) => <button type="button" key={value} disabled={status === "保存中…"} onClick={() => send(value)} className={`rounded-full border px-3 py-2 text-xs font-semibold ${selected === value ? "border-[#245b46] bg-[#eaf2ed] text-[#245b46]" : "border-black/10 bg-white"}`}>{label}</button>)}</div>{status && <p className="mt-2 text-xs text-[#65706a]">{status}</p>}</div>;
}
