"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { tripInputSchema } from "@/schemas/trip";
import { migrateTripInput } from "@/schemas/migration";

const steps = ["正在理解你的旅行偏好", "正在规划每天的游玩区域", "正在检查时间和交通安排", "正在检查行程强度", "正在整理你的专属攻略"];

export function GeneratingView() {
  const router = useRouter();
  const started = useRef(false);
  const [step, setStep] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState("");
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const rawInput = window.localStorage.getItem("wandernote:demo-input");
    let input: ReturnType<typeof tripInputSchema.safeParse> | null = null;
    try { const migrated = rawInput ? migrateTripInput(JSON.parse(rawInput)) : null; input = migrated ? tripInputSchema.safeParse(migrated) : null; } catch { input = null; }
    if (!input?.success) { queueMicrotask(() => setError("没有找到有效的旅行需求，请返回重新填写。")); return; }
    const validInput = input.data;
    const interval = window.setInterval(() => setStep((current) => Math.min(current + 1, steps.length - 1)), 9000);
    const elapsedTimer = window.setInterval(() => setSeconds((current) => current + 1), 1000);
    const beforeUnload = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener("beforeunload", beforeUnload);
    async function generate() {
      try {
        const response = await fetch("/api/trips", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(validInput) });
        const payload = await response.json() as { tripId?: string; error?: { message?: string } };
        if (!response.ok) throw new Error(payload.error?.message || "生成失败，请稍后重试");
        if (!payload.tripId) throw new Error("攻略已生成，但没有返回访问地址");
        window.localStorage.removeItem("wandernote:last-undo");
        window.localStorage.setItem("wandernote:recent-trip-id", payload.tripId);
        router.replace(`/trip/${payload.tripId}`);
      } catch (cause) { setError(cause instanceof Error ? cause.message : "生成失败，请稍后重试"); }
      finally { window.clearInterval(interval); window.clearInterval(elapsedTimer); window.removeEventListener("beforeunload", beforeUnload); }
    }
    void generate();
    return () => { window.clearInterval(interval); window.clearInterval(elapsedTimer); window.removeEventListener("beforeunload", beforeUnload); };
  }, [router, retryKey]);

  function retry() { started.current = false; setError(""); setStep(0); setSeconds(0); setRetryKey((value) => value + 1); }

  if (error) return <main className="page-shell flex min-h-[75vh] items-center justify-center py-12"><div className="card w-full max-w-lg rounded-3xl p-8 text-center"><div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[#fff0e8] text-2xl">!</div><h1 className="mt-5 text-2xl font-bold">这次没有生成成功</h1><p className="mt-3 leading-7 text-[#65706a]">{error}</p><div className="mt-7 flex justify-center gap-3"><Link href="/create" className="rounded-full border border-black/10 px-5 py-3 font-semibold">返回修改</Link><button onClick={retry} className="rounded-full bg-[#245b46] px-5 py-3 font-semibold text-white">重新生成</button></div></div></main>;

  return <main className="page-shell flex min-h-[75vh] items-center justify-center py-12"><div className="w-full max-w-lg text-center"><div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-[#e3eee7]"><div className="h-9 w-9 animate-spin rounded-full border-4 border-[#245b46]/20 border-t-[#245b46]" /></div><p className="mt-8 text-sm font-bold text-[#287057]">AI 旅行管家正在生成</p><h1 className="mt-3 text-3xl font-bold">一份适合你的旅行，正在成形</h1><p className="mt-3 text-sm font-semibold text-[#245b46]">已等待 {seconds} 秒</p><div className="mt-7 space-y-2 text-left">{steps.map((label, index) => <div key={label} className={`flex items-center gap-3 rounded-2xl border p-3.5 transition ${index <= step ? "border-[#245b46]/20 bg-white text-[#24332c]" : "border-transparent text-[#a0a6a2]"}`}><span className={`grid h-6 w-6 place-items-center rounded-full text-xs font-bold ${index < step ? "bg-[#245b46] text-white" : index === step ? "bg-[#dfece4] text-[#245b46]" : "bg-black/5"}`}>{index < step ? "✓" : index + 1}</span><span className="font-semibold">{label}</span></div>)}</div><p className="mt-6 text-xs leading-5 text-[#828a85]">阶段文案是等待提示，不代表服务端实时进度。请保持页面开启，离开可能中断本次生成。</p></div></main>;
}
