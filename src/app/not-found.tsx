import Link from "next/link";

export default function NotFound() {
  return <main className="page-shell flex min-h-[70vh] items-center justify-center py-12"><div className="card max-w-lg rounded-3xl p-8 text-center"><p className="text-sm font-bold text-[#287057]">一键出发</p><h1 className="mt-3 text-3xl font-bold">这条路线没有找到</h1><p className="mt-3 leading-7 text-[#65706a]">链接可能已经失效，或者地址不完整。回到首页，重新安排一次吧。</p><Link href="/#plan" className="mt-7 inline-block rounded-full bg-[#245b46] px-6 py-3 font-bold text-white">帮我安排这几天</Link></div></main>;
}
