import Link from "next/link";

type BrandMarkProps = { href?: string; align?: "start" | "center"; size?: "header" | "compact"; className?: string };

function BrandContents({ align = "start", size = "header" }: Pick<BrandMarkProps, "align" | "size">) {
  const centered = align === "center";
  return <span className={`inline-flex items-start gap-2.5 ${centered ? "justify-center" : "justify-start"}`}>
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className={`${size === "header" ? "mt-0.5 h-5 w-5" : "mt-px h-4 w-4"} shrink-0 text-[#d9913f]`}><path d="M7 17 17 7M9 7h8v8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
    <span className="flex flex-col items-center"><span className={`${size === "header" ? "text-lg" : "text-base"} whitespace-nowrap font-bold leading-none tracking-tight text-[#202d27]`}>一键出发</span><span className={`${size === "header" ? "mt-1 text-[7px]" : "mt-0.5 text-[6px]"} whitespace-nowrap font-medium leading-none tracking-[0.2em] text-[#c98235]`}>TRIP READY</span></span>
  </span>;
}

export function BrandMark({ href, align = "start", size = "header", className = "" }: BrandMarkProps) {
  if (href) return <Link href={href} aria-label="一键出发首页" className={`focus-ring inline-flex rounded-lg ${className}`}><BrandContents align={align} size={size} /></Link>;
  return <span className={`inline-flex ${className}`}><BrandContents align={align} size={size} /></span>;
}
