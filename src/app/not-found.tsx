import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";

export default function NotFound() {
  return <main className="page-shell flex min-h-[70vh] items-center justify-center py-12"><div className="card max-w-lg rounded-3xl p-8 text-center"><BrandMark align="center" size="compact" /><div className="mx-auto mt-6 grid h-14 w-14 place-items-center rounded-full bg-[#fbe9e5] text-[#a34838]" aria-hidden="true"><svg viewBox="0 0 24 24" className="h-7 w-7 fill-none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="9" /><path d="m9 9 6 6m0-6-6 6" /></svg></div><h1 className="mt-4 text-3xl font-bold">这条路线没有找到</h1><p className="mt-3 leading-7 text-[#65706a]">链接可能已经失效，或者地址不完整。回到首页，重新安排一次吧。</p><Link href="/#plan" className="mt-7 inline-block rounded-full bg-[#245b46] px-6 py-3 font-bold text-white">帮我安排这几天</Link></div></main>;
}
