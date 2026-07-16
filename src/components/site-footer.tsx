import Link from "next/link";
import { BrandMark } from "./brand-mark";

export function SiteFooter({contactEmail}:{contactEmail?:string}) {
  return <footer className="border-t border-black/5 bg-[#f4f5f0]"><div className="page-shell py-8"><div className="flex flex-col items-center gap-5 sm:flex-row sm:justify-between"><BrandMark align="center" size="compact"/><nav className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm text-[#526159]"><Link href="/about">关于一键出发</Link><Link href="/privacy">隐私政策</Link><Link href="/terms">服务协议</Link>{contactEmail&&<a href={`mailto:${contactEmail}`}>联系我们</a>}</nav></div><p className="mt-5 text-center text-xs text-[#7b847e]">© {new Date().getFullYear()} 一键出发 · www.yjchufa.com</p></div></footer>;
}
