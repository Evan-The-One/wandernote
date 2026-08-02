export function SectionHeading({ eyebrow, title, description }: { eyebrow: string; title: string; description?: string }) {
  return (
    <div className="max-w-2xl">
      <p className="mb-2 text-sm font-semibold uppercase tracking-[0.16em] text-[var(--brand-primary)]">{eyebrow}</p>
      <h2 className="text-3xl font-bold tracking-[-.035em] text-[var(--text-strong)] sm:text-4xl">{title}</h2>
      {description && <p className="mt-4 leading-8 text-[var(--text-secondary)]">{description}</p>}
    </div>
  );
}
