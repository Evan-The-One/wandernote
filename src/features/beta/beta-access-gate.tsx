"use client";

import { FormEvent, useEffect, useState } from "react";

export function BetaAccessGate({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<"loading" | "open" | "locked">("loading");
  const [code, setCode] = useState(""); const [error, setError] = useState(""); const [submitting, setSubmitting] = useState(false);
  useEffect(() => { fetch("/api/beta-access").then((response) => response.json()).then((value: { enabled: boolean; authorized: boolean }) => setState(!value.enabled || value.authorized ? "open" : "locked")).catch(() => setState("open")); }, []);
  async function submit(event: FormEvent) {
    event.preventDefault(); setSubmitting(true); setError("");
    try { const response = await fetch("/api/beta-access", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code }) }); const payload = await response.json() as { error?: { message?: string } }; if (!response.ok) throw new Error(payload.error?.message || "访问码验证失败"); setState("open"); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "访问码验证失败"); } finally { setSubmitting(false); }
  }
  if (state === "loading") return <div className="grid min-h-64 place-items-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-[#245b46]/20 border-t-[#245b46]" /></div>;
  if (state === "open") return children;
  return <div className="card mx-auto max-w-md rounded-3xl p-7 text-center"><p className="text-sm font-bold text-[#287057]">小范围 Beta</p><h2 className="mt-2 text-2xl font-bold">输入测试访问码</h2><p className="mt-3 text-sm leading-6 text-[#65706a]">当前只向受邀用户开放。访问码仅在服务端验证，不会写入页面代码。</p><form onSubmit={submit} className="mt-6"><input type="password" value={code} onChange={(event) => setCode(event.target.value)} maxLength={100} className="focus-ring w-full rounded-2xl border border-black/10 bg-white px-4 py-3" placeholder="测试访问码" />{error && <p className="mt-3 text-sm font-semibold text-red-700">{error}</p>}<button disabled={submitting} className="mt-4 w-full rounded-full bg-[#245b46] px-5 py-3 font-bold text-white disabled:opacity-50">{submitting ? "正在验证…" : "进入规划"}</button></form></div>;
}
