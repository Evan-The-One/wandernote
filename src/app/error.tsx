"use client";

import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className="page-shell flex min-h-[70vh] items-center justify-center py-12"><div className="card max-w-lg rounded-3xl p-8 text-center"><BrandMark align="center" size="compact" /><div className="mx-auto mt-6 grid h-14 w-14 place-items-center rounded-full bg-[#fbe9e5] text-[#a34838]" aria-hidden="true"><svg viewBox="0 0 24 24" className="h-7 w-7 fill-none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="9" /><path d="M12 7.5v6M12 17h.01" /></svg></div><h1 className="mt-4 text-3xl font-bold">刚才没有安排好</h1><p className="mt-3 leading-7 text-[#65706a]">原来的输入和已保存计划不会丢失，可以直接重试。</p><div className="mt-7 flex flex-wrap justify-center gap-3"><button type="button" onClick={reset} className="rounded-full bg-[#245b46] px-6 py-3 font-bold text-white">再试一次</button><Link href="/#plan" className="rounded-full border border-black/10 px-6 py-3 font-bold">换个玩法重新安排</Link></div></div></main>;
}
