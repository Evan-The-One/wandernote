import Link from "next/link";
import { BrandIcon } from "./brand-icon";

type BrandMarkProps = { href?: string; align?: "start" | "center"; size?: "header" | "compact"; className?: string };

function BrandContents({ align = "start", size = "header" }: Pick<BrandMarkProps, "align" | "size">) {
  const centered = align === "center";
  return <span className={`inline-flex items-center gap-2.5 ${centered ? "justify-center" : "justify-start"}`}>
    <BrandIcon className={size === "header" ? "h-9 w-9" : "h-8 w-8"} />
    <span className="flex flex-col items-center"><span className={`${size === "header" ? "text-lg" : "text-base"} whitespace-nowrap font-bold leading-none tracking-[-.02em] text-[var(--text-strong)]`}>一键出发</span><span className={`${size === "header" ? "mt-1.5 text-[8px]" : "mt-1 text-[7px]"} whitespace-nowrap font-semibold leading-none tracking-[0.22em] text-[var(--warning)]`}>TRIP READY</span></span>
  </span>;
}

export function BrandMark({ href, align = "start", size = "header", className = "" }: BrandMarkProps) {
  if (href) return <Link href={href} aria-label="一键出发首页" className={`focus-ring inline-flex rounded-lg ${className}`}><BrandContents align={align} size={size} /></Link>;
  return <span className={`inline-flex ${className}`}><BrandContents align={align} size={size} /></span>;
}
