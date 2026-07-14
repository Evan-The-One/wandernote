"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { tripInputSchema } from "@/schemas/trip";
import { migrateTripInput } from "@/schemas/migration";
import type { TripInput } from "@/types/trip";
import { priorityOptions, travelStyles } from "@/features/trip-input/options";
import { BrandMark } from "@/components/brand-mark";
import { PlanningProgress } from "@/components/planning-progress";

const steps = ["正在理解你的旅行偏好", "正在安排每天的游玩区域", "正在调整交通与行程节奏", "正在检查强度和预算", "正在整理你的专属旅行计划"];
const errorMessages: Record<string, string> = {
  AI_DISABLED: "当前暂停生成新计划，请稍后再试。",
  DAILY_LIMIT_REACHED: "今天的生成次数已用完，请明天再来。",
  OPENAI_AUTH_ERROR: "AI服务配置异常，管理员正在处理。",
  OPENAI_QUOTA_ERROR: "AI服务额度暂时不足，请稍后再试。",
  OPENAI_TIMEOUT: "AI这次思考时间过长，请直接重试。",
  DATABASE_ERROR: "计划暂时无法保存，请稍后重试。",
  FUNCTION_TIMEOUT: "生成时间超过服务器限制，请直接重试。",
  VALIDATION_FAILED: "这次行程没有通过我们的质量检查，换个玩法再试一次吧。",
  UNKNOWN_ERROR: "服务暂时不可用，请稍后重试。",
};
const stylePlanning: Record<TripInput["travelStyle"], string> = {
  fast_paced: "你选择了特种兵，我们会早出晚归、多逛多打卡，同时保留交通和吃饭时间。",
  slow: "你选择了慢慢逛，我们会让每个地方停留更久，不频繁赶场。",
  lazy: "你选择了轻松玩，我们会减少步行、换乘和跨区安排，并尽量晚些出发。",
  food: "你选择了美食探索，我们会围绕本地美食和相邻街区安排路线。",
  romantic: "你选择了情侣旅行，我们会优先考虑氛围、拍照和约会体验。",
  family: "你选择了亲子旅行，我们会控制强度，增加休息和便利性。",
};

export function GeneratingView() {
  const router = useRouter();
  const started = useRef(false);
  const [error, setError] = useState("");
  const [retryKey, setRetryKey] = useState(0);
  const [summary, setSummary] = useState<TripInput | null>(null);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const rawInput = window.localStorage.getItem("yijianchufa:trip-input") || window.localStorage.getItem("wandernote:demo-input");
    let input: ReturnType<typeof tripInputSchema.safeParse> | null = null;
    try { const migrated = rawInput ? migrateTripInput(JSON.parse(rawInput)) : null; input = migrated ? tripInputSchema.safeParse(migrated) : null; } catch { input = null; }
    if (!input?.success) { queueMicrotask(() => setError("没有找到有效的旅行需求，请返回重新填写。")); return; }
    const validInput = input.data;
    queueMicrotask(() => setSummary(validInput));
    const beforeUnload = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener("beforeunload", beforeUnload);
    async function generate() {
      try {
        const response = await fetch("/api/trips", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(validInput) });
        const payload = await response.json() as { tripId?: string; error?: { code?: string; message?: string } };
        if (!response.ok) throw new Error(errorMessages[payload.error?.code || ""] || payload.error?.message || "生成失败，请稍后重试");
        if (!payload.tripId) throw new Error("攻略已生成，但没有返回访问地址");
        window.localStorage.removeItem("wandernote:last-undo");
        window.localStorage.setItem("wandernote:recent-trip-id", payload.tripId);
        router.replace(`/trip/${payload.tripId}`);
      } catch (cause) { setError(cause instanceof Error ? cause.message : "生成失败，请稍后重试"); }
      finally { window.removeEventListener("beforeunload", beforeUnload); }
    }
    void generate();
    return () => { window.removeEventListener("beforeunload", beforeUnload); };
  }, [router, retryKey]);

  function retry() { started.current = false; setError(""); setRetryKey((value) => value + 1); }

  if (error) return <main className="page-shell flex min-h-[75vh] items-center justify-center py-12"><div className="card w-full max-w-lg rounded-3xl p-8 text-center"><BrandMark align="center" size="compact" /><div className="mx-auto mt-6 grid h-14 w-14 place-items-center rounded-full bg-[#fbe9e5] text-[#a34838]" aria-hidden="true"><svg viewBox="0 0 24 24" className="h-7 w-7 fill-none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="9" /><path d="M12 7.5v6M12 17h.01" /></svg></div><h1 className="mt-4 text-2xl font-bold">这次没有安排成功</h1><p className="mt-3 leading-7 text-[#65706a]">{error}</p><div className="mt-7 flex flex-wrap justify-center gap-3"><Link href="/#plan" className="rounded-full border border-black/10 px-5 py-3 font-semibold">返回修改</Link><button onClick={retry} className="rounded-full bg-[#245b46] px-5 py-3 font-semibold text-white">使用原条件重新生成</button></div></div></main>;

  const styleLabel = travelStyles.find((item) => item.value === summary?.travelStyle)?.label;
  const priorityLabels = summary?.priorities.map((value) => priorityOptions.find((item) => item.value === value)?.label).filter(Boolean) || [];
  return <main className="page-shell flex min-h-[75vh] items-center justify-center py-12"><div className="w-full max-w-xl text-center"><BrandMark align="center" size="compact" /><div className="mx-auto mt-8 h-16 w-40" aria-hidden="true"><svg viewBox="0 0 160 64" fill="none" className="h-full w-full text-[#9ebdab]"><path d="M8 45c25-34 46 13 72-14s44 17 72-13" stroke="currentColor" strokeWidth="2" strokeDasharray="4 6" strokeLinecap="round" /><circle cx="8" cy="45" r="5" fill="#d9913f" /><circle cx="80" cy="31" r="5" fill="#dce9e1" stroke="#245b46" /><circle cx="152" cy="18" r="5" fill="#dce9e1" stroke="#245b46" /></svg></div><h1 className="mt-5 text-3xl font-bold">正在为你安排这几天</h1><p className="mt-3 text-sm leading-6 text-[#65706a]">通常需要约 30～60 秒，<br className="sm:hidden" />复杂行程可能稍久，请稍等一下。</p>{summary && <div className="mt-6 rounded-2xl bg-white p-4 text-left shadow-sm"><div className="flex flex-wrap gap-2 text-sm font-bold"><span>{summary.destination.city}</span><span className="text-[#a0a6a2]">·</span><span>{summary.days}天</span><span className="text-[#a0a6a2]">·</span><span>{styleLabel}</span>{priorityLabels.length > 0 && <><span className="text-[#a0a6a2]">·</span><span>{priorityLabels.join("、")}</span></>}</div><p className="mt-3 text-sm leading-6 text-[#65706a]">{stylePlanning[summary.travelStyle]}</p></div>}<PlanningProgress steps={steps} intervalMs={8000} /><p className="mt-6 text-xs leading-5 text-[#828a85]">页面提示用于展示规划过程，实际完成时间以生成结果为准。</p></div></main>;
}
