import Image from "next/image";

type BrandIconProps = { className?: string; priority?: boolean };

export function BrandIcon({ className = "", priority = false }: BrandIconProps) {
  return <span className={`grid shrink-0 place-items-center overflow-hidden rounded-xl ${className}`}>
    <Image src="/brand/icon-192.png" alt="" aria-hidden="true" width={192} height={192} priority={priority} className="h-full w-full object-contain" />
  </span>;
}

export const BrandLogo = BrandIcon;
