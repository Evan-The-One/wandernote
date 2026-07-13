"use client";

import Link from "next/link";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className="page-shell flex min-h-[70vh] items-center justify-center py-12"><div className="card max-w-lg rounded-3xl p-8 text-center"><p className="text-sm font-bold text-[#287057]">一键出发</p><h1 className="mt-3 text-3xl font-bold">刚才没有安排好</h1><p className="mt-3 leading-7 text-[#65706a]">原来的输入和已保存计划不会丢失，可以直接重试。</p><div className="mt-7 flex flex-wrap justify-center gap-3"><button type="button" onClick={reset} className="rounded-full bg-[#245b46] px-6 py-3 font-bold text-white">再试一次</button><Link href="/#plan" className="rounded-full border border-black/10 px-6 py-3 font-bold">换个玩法重新安排</Link></div></div></main>;
}
