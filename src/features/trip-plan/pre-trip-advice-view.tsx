import type { PreTripAdvice } from "./pre-trip-advice";

const items: Array<{ key: keyof PreTripAdvice; label: string; path: string }> = [
  { key: "transport", label: "出行建议", path: "M4 15h16M7 15l-1 4m11-4 1 4M6 15V9l2-4h8l2 4v6M8 11h8" },
  { key: "accommodation", label: "住宿建议", path: "M4 19V9l8-5 8 5v10M8 19v-6h8v6" },
  { key: "clothing", label: "穿着建议", path: "M8 5 4 8l3 4v8h10v-8l3-4-4-3-2 3h-4L8 5Z" },
  { key: "photoSpots", label: "拍照提示", path: "M5 8h3l1-2h6l1 2h3v10H5V8Zm7 3a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z" },
  { key: "food", label: "吃点什么", path: "M7 4v7m-2-7v5a2 2 0 0 0 4 0V4m0 7v9m7-16c-2 2-2 7 0 9v7" },
  { key: "timing", label: "时间提醒", path: "M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16Zm0 4v5l3 2" },
];

export function PreTripAdviceView({ advice }: { advice: PreTripAdvice }) {
  return <section className="page-shell mt-6"><div className="card rounded-3xl p-5 sm:p-7"><h2 className="text-xl font-bold text-[#204f3c]">出发前看一眼</h2><div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">{items.map((item)=><div key={item.key} className="min-w-0 rounded-2xl bg-[#f4f6f1] p-3"><svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 text-[#287057]" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d={item.path}/></svg><h3 className="mt-2 text-sm font-bold text-[#245b46]">{item.label}</h3><p className="mt-1 text-xs leading-5 text-[#65706a]">{advice[item.key]}</p></div>)}</div></div></section>;
}
