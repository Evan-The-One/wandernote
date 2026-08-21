"use client";

import Image from "next/image";
import { useEffect, useId, useRef, useState } from "react";
import { posterExamples } from "@/config/poster-examples";
import { trackEvent } from "@/features/analytics/client";

type GalleryProps = {
  tripId?: string;
  compact?: boolean;
  context?: "home" | "trip";
  heading?: boolean;
};

export function PosterExampleGallery({ tripId, compact = false, context = "trip", heading = true }: GalleryProps) {
  const [active, setActive] = useState<number | null>(null);
  const [failed, setFailed] = useState<Record<string, number>>({});
  const closeRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const titleId = useId();
  function restoreTriggerFocus() {
    const trigger = triggerRef.current;
    window.requestAnimationFrame(() => trigger?.focus());
  }
  useEffect(() => { trackEvent("poster_examples_viewed", { pageName: context, tripId, metadata: { count: posterExamples.length } }); }, [context, tripId]);
  useEffect(() => {
    if (active === null) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setActive(null); restoreTriggerFocus(); }
      if (event.key === "ArrowRight") setActive((value) => value === null ? 0 : Math.min(value + 1, posterExamples.length - 1));
      if (event.key === "ArrowLeft") setActive((value) => value === null ? 0 : Math.max(value - 1, 0));
      if (event.key === "Tab" && dialogRef.current) {
        const controls = Array.from(dialogRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'));
        if (!controls.length) return;
        const first = controls[0]; const last = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = previousOverflow; };
  }, [active, context, tripId]);
  function close() { setActive(null); restoreTriggerFocus(); }
  if (!posterExamples.length) return null;
  return <>
    <div className={context === "home" ? "" : "mt-5"}>
      {heading && !compact && <><h3 className="text-sm font-bold text-[#245b46]">{context === "home" ? "看看生成后的样子" : "看看示例"}</h3>{context === "home" && <p className="mt-1 text-xs text-[#707a74]">行程规划好后，还可以生成这样一张专属旅行海报。</p>}</>}
      <div className={`poster-example-grid mt-3 flex snap-x gap-3 overflow-x-auto pb-1 min-[375px]:grid min-[375px]:grid-cols-2 min-[375px]:overflow-visible min-[375px]:pb-0 ${compact ? "is-compact" : ""}`}>
        {posterExamples.map((example, index) => <button key={example.id} ref={(node) => { if (active === index) triggerRef.current = node; }} type="button" onClick={(event) => { triggerRef.current = event.currentTarget; setActive(index); trackEvent("poster_example_opened", { pageName: context, tripId, metadata: { exampleId: example.id } }); }} className="poster-example-card w-[64vw] shrink-0 snap-start min-[375px]:w-auto" aria-label={`查看${example.destination}旅行海报高清示例`}>
          <span className="poster-example-image-wrap">
            {failed[example.id] ? <span className="poster-example-fallback"><span>示例海报暂时无法显示</span><span onClick={(event) => { event.stopPropagation(); setFailed((value) => ({ ...value, [example.id]: 0 })); }} className="mt-2 underline">重新加载</span></span> : <Image key={`${example.id}-${failed[example.id] ?? 0}`} src={example.thumbnailAsset} width={320} height={480} alt={`一键出发${example.destination}旅行海报示例`} className="h-auto w-full object-contain" sizes={context === "home" ? "(max-width: 374px) 64vw, (max-width: 767px) 44vw, 190px" : "(max-width: 374px) 64vw, (max-width: 767px) 44vw, 180px"} loading="lazy" quality={75} onError={() => setFailed((value) => ({ ...value, [example.id]: (value[example.id] ?? 0) + 1 }))} />}
          </span>
          <span className="block px-2.5 py-2 text-center text-xs font-semibold text-[var(--brand-primary)]">{example.destination}示例</span>
        </button>)}
      </div>
    </div>
    {active !== null && posterExamples[active] && <div className="fixed inset-0 z-[100] overflow-y-auto bg-black/70 p-2 sm:p-6" role="dialog" aria-modal="true" aria-labelledby={titleId} onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}>
      <div ref={dialogRef} className="mx-auto my-2 w-full max-w-3xl rounded-3xl bg-[#f7f5ef] p-3 shadow-2xl sm:my-6 sm:p-4">
        <div className="mb-3 flex items-start justify-between gap-3"><div><h2 id={titleId} className="font-bold text-[#204f3c]">{posterExamples[active].title}</h2><p className="mt-1 text-xs text-[#65706a]">示例仅供效果参考，实际内容会根据你的行程生成。</p></div><button ref={closeRef} type="button" onClick={close} aria-label="关闭示例预览" className="min-h-11 min-w-11 rounded-full bg-white text-xl">×</button></div>
        {failed[posterExamples[active].id] ? <div className="poster-example-fallback min-h-80 rounded-2xl bg-white"><span>示例海报暂时无法显示</span><button type="button" onClick={() => setFailed((value) => ({ ...value, [posterExamples[active]!.id]: 0 }))} className="mt-3 min-h-11 rounded-full border px-4 font-semibold">重新加载</button></div> : <Image key={`full-${posterExamples[active].id}-${failed[posterExamples[active].id] ?? 0}`} unoptimized src={posterExamples[active].fullAsset} width={1200} height={1800} alt={`${posterExamples[active].title}高清示例`} className="h-auto w-full rounded-2xl" sizes="(max-width: 767px) calc(100vw - 28px), 720px" priority onError={() => setFailed((value) => ({ ...value, [posterExamples[active]!.id]: (value[posterExamples[active]!.id] ?? 0) + 1 }))} />}
        <div className="mt-3 flex items-center justify-center gap-3 text-sm"><button type="button" disabled={active === 0} onClick={() => setActive((value) => Math.max(0, (value ?? 0) - 1))} className="rounded-full border bg-white px-4 py-2 disabled:opacity-30">上一张</button><span>{active + 1} / {posterExamples.length}</span><button type="button" disabled={active === posterExamples.length - 1} onClick={() => setActive((value) => Math.min(posterExamples.length - 1, (value ?? 0) + 1))} className="rounded-full border bg-white px-4 py-2 disabled:opacity-30">下一张</button></div>
      </div>
    </div>}
  </>;
}
