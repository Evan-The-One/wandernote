import type { ReactNode } from "react";

export function SafeEmphasis({ text, candidates }: { text: string; candidates: Array<string | null | undefined> }) {
  const usable = [...new Set(candidates.map((item) => item?.trim()).filter((item): item is string => Boolean(item && item.length >= 2 && item.length <= 20 && text.includes(item))))]
    .sort((a, b) => b.length - a.length)
    .filter((item, index, values) => !values.slice(0, index).some((parent) => parent.includes(item)))
    .slice(0, 4);
  const max = Math.floor(text.length * 0.3);
  const allowed = usable.reduce<string[]>((selected, item) => selected.reduce((sum, value) => sum + value.length, 0) + item.length <= max ? [...selected, item] : selected, []);
  if (!allowed.length) return text;
  const pattern = new RegExp(`(${allowed.map(escapeRegExp).join("|")})`, "g");
  return <>{text.split(pattern).map((part, index): ReactNode => allowed.includes(part) ? <strong key={`${part}-${index}`} className="font-semibold text-[#26352e]">{part}</strong> : part)}</>;
}

function escapeRegExp(value: string) { return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
