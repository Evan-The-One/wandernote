type BrandIconProps = { className?: string };

/**
 * Temporary icon adapter. The final brand icon is intentionally not locked in;
 * replacing this component updates navigation, login and public brand marks.
 */
export function BrandIcon({ className = "" }: BrandIconProps) {
  return <span className={`grid shrink-0 place-items-center rounded-xl border border-[var(--border-soft)] bg-white text-[var(--brand-primary)] shadow-sm ${className}`}>
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-[56%] w-[56%]">
      <path d="M7 17 17 7M9 7h8v8" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="6.8" cy="17.2" r="1.4" fill="var(--accent-warm)" stroke="none" />
    </svg>
  </span>;
}
