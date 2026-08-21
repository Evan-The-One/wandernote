"use client";

import { useState } from "react";
import { trackEvent } from "@/features/analytics/client";

const ratings = [["helpful", "很有帮助"], ["usable", "基本可用"], ["not_helpful", "不太有用"]] as const;
const tags = [["bad_route", "行程不合理"], ["time_issue", "时间安排问题"], ["image_mismatch", "图片不匹配"], ["poster_issue", "海报问题"], ["unclear_operation", "操作不清楚"], ["other", "其他建议"]] as const;

export function BetaFeedback({ tripId }: { tripId: string }) {
  const [rating, setRating] = useState<typeof ratings[number][0] | null>(null); const [selected, setSelected] = useState<string[]>([]); const [comment, setComment] = useState(""); const [status, setStatus] = useState("");
  async function submit() {
    if (!rating) return;
    setStatus("提交中…");
    try {
      const response = await fetch(`/api/trips/${tripId}/feedback`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rating, issueTags: selected, comment: comment.trim() || null }) });
      if (response.ok) {
        trackEvent("feedback_submitted", { pageName: "trip", tripId, metadata: { rating, tagCount: selected.length } });
        setStatus("谢谢，你的反馈已经保存。");
      } else setStatus("提交失败，请稍后重试。");
    } catch {
      setStatus("网络不可用，请稍后重试。");
    }
  }
  return <section className="page-shell mb-20 mt-10"><div className="card rounded-3xl p-6 sm:p-8"><h2 className="text-xl font-bold">整份旅行计划对你有帮助吗？</h2><div className="mt-4 flex flex-wrap gap-2">{ratings.map(([value, label]) => <button type="button" key={value} onClick={() => setRating(value)} className={`rounded-full border px-4 py-2 text-sm font-semibold ${rating === value ? "border-[#245b46] bg-[#eaf2ed] text-[#245b46]" : "border-black/10 bg-white"}`}>{label}</button>)}</div><p className="mt-6 text-sm font-bold">哪里可以改进？</p><div className="mt-3 flex flex-wrap gap-2">{tags.map(([value, label]) => <button type="button" key={value} onClick={() => setSelected((items) => items.includes(value) ? items.filter((item) => item !== value) : [...items, value])} className={`rounded-full border px-3 py-2 text-sm ${selected.includes(value) ? "border-[#245b46] bg-[#eaf2ed]" : "border-black/10 bg-white"}`}>{label}</button>)}</div><textarea value={comment} onChange={(event) => setComment(event.target.value)} maxLength={300} className="mt-4 min-h-24 w-full rounded-2xl border border-black/10 bg-white p-4" placeholder="补充反馈（选填）" /><div className="mt-4 flex items-center gap-4"><button type="button" disabled={!rating || status === "提交中…"} onClick={submit} className="rounded-full bg-[#245b46] px-5 py-2.5 font-bold text-white disabled:opacity-40">提交反馈</button>{status && <p className="text-sm text-[#65706a]">{status}</p>}</div></div></section>;
}
