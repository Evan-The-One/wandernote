"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { posterExamples } from "@/config/poster-examples";
import { trackEvent } from "@/features/analytics/client";

export function PosterExampleGallery({ tripId, compact = false }: { tripId: string; compact?: boolean }) {
  const [active, setActive] = useState<number | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  useEffect(() => { trackEvent("poster_example_impression", { pageName: "trip", tripId, metadata: { count: posterExamples.length } }); }, [tripId]);
  useEffect(() => {
    if (active === null) return;
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setActive(null); trackEvent("poster_example_modal_close", { pageName: "trip", tripId }); queueMicrotask(() => triggerRef.current?.focus()); }
      if (event.key === "ArrowRight") setActive((value) => value === null ? 0 : Math.min(value + 1, posterExamples.length - 1));
      if (event.key === "ArrowLeft") setActive((value) => value === null ? 0 : Math.max(value - 1, 0));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, tripId]);
  function close() { setActive(null); trackEvent("poster_example_modal_close", { pageName: "trip", tripId }); queueMicrotask(() => triggerRef.current?.focus()); }
  if (!posterExamples.length) return null;
  return <>
    <div className="mt-5">
      {!compact && <><h3 className="text-sm font-bold text-[#245b46]">看看生成出来的样子</h3><p className="mt-1 text-xs text-[#707a74]">已通过人工验收的真实海报示例</p></>}
      <div className={`mt-3 flex snap-x gap-3 overflow-x-auto pb-2 ${compact ? "max-w-36" : "sm:grid sm:grid-cols-3 sm:overflow-visible"}`}>
        {posterExamples.map((example, index) => <button key={example.id} ref={(node) => { if (active === index) triggerRef.current = node; }} type="button" onClick={(event) => { triggerRef.current = event.currentTarget; setActive(index); trackEvent("poster_example_thumbnail_click", { pageName: "trip", tripId, metadata: { exampleId: example.id } }); trackEvent("poster_example_modal_open", { pageName: "trip", tripId }); }} className={`${compact ? "w-28" : "w-36 sm:w-auto"} shrink-0 snap-start overflow-hidden rounded-2xl border border-[#245b46]/15 bg-white text-left shadow-sm`} aria-label={`放大查看${example.title}示例`}>
          <Image src={example.thumbnailAsset} width={320} height={480} alt={`${example.title}旅行海报示例`} className={`${compact ? "h-28" : "h-40 sm:h-48"} w-full object-cover object-top`} />
          <span className="block px-3 py-2"><strong className="block text-xs text-[#245b46]">示例 · {example.subtitle}</strong>{!compact && <span className="mt-0.5 block text-xs text-[#707a74]">{example.title}</span>}</span>
        </button>)}
      </div>
    </div>
    {active !== null && posterExamples[active] && <div className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-black/65 p-3 sm:p-6" role="dialog" aria-modal="true" aria-label="旅行海报示例预览" onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}>
      <div className="my-auto w-full max-w-3xl rounded-3xl bg-[#f7f5ef] p-4 shadow-2xl">
        <div className="mb-3 flex items-start justify-between gap-3"><div><h2 className="font-bold text-[#204f3c]">{posterExamples[active].title}</h2><p className="mt-1 text-xs text-[#65706a]">示例仅供效果参考，实际内容会根据你的行程生成。</p></div><button ref={closeRef} type="button" onClick={close} aria-label="关闭示例预览" className="min-h-11 min-w-11 rounded-full bg-white text-xl">×</button></div>
        <Image src={posterExamples[active].fullAsset} width={1024} height={1536} alt={`${posterExamples[active].title}高清示例`} className="h-auto w-full rounded-2xl" priority />
        <div className="mt-3 flex items-center justify-center gap-3 text-sm"><button type="button" disabled={active === 0} onClick={() => setActive((value) => Math.max(0, (value ?? 0) - 1))} className="rounded-full border bg-white px-4 py-2 disabled:opacity-30">上一张</button><span>{active + 1} / {posterExamples.length}</span><button type="button" disabled={active === posterExamples.length - 1} onClick={() => setActive((value) => Math.min(posterExamples.length - 1, (value ?? 0) + 1))} className="rounded-full border bg-white px-4 py-2 disabled:opacity-30">下一张</button></div>
      </div>
    </div>}
  </>;
}
