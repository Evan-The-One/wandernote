export function SectionHeading({ eyebrow, title, description }: { eyebrow: string; title: string; description?: string }) {
  return (
    <div className="max-w-2xl">
      <p className="mb-2 text-sm font-bold uppercase tracking-[0.18em] text-[#287057]">{eyebrow}</p>
      <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">{title}</h2>
      {description && <p className="mt-4 leading-7 text-[#65706a]">{description}</p>}
    </div>
  );
}
