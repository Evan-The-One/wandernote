"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { budgetModes, priorityOptions, transportOptions, travelStyles } from "./options";
import { travelInspirations } from "./inspirations";
import { tripInputSchema } from "@/schemas/trip";
import type { TripInput } from "@/types/trip";
import { migrateTripInput } from "@/schemas/migration";
import { DestinationRecommender } from "./destination-recommender";
import { BrandMark } from "@/components/brand-mark";

const LEGACY_INPUT_KEY = "wandernote:demo-input";
const INPUT_KEY = "yijianchufa:trip-input";

const inputClass = "focus-ring mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-base shadow-sm placeholder:text-black/30";
const selectedCard = "border-[#245b46] bg-[#eaf2ed] text-[#183b2e] shadow-sm";
const plainCard = "border-black/8 bg-white hover:border-[#245b46]/40";
const coreQuestionClass = "text-xl font-semibold tracking-tight sm:text-2xl";

function NumberStepper({ label, value, min, max, onChange }: { label: "成人" | "儿童"; value: number; min: number; max: number; onChange: (value: number) => void }) {
  return <div><p className="text-sm font-semibold">{label}数量</p><div className="mt-2 flex h-12 items-center overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm"><button type="button" aria-label={`减少${label}数量`} disabled={value <= min} onClick={() => onChange(value - 1)} className="focus-ring grid h-12 w-12 shrink-0 place-items-center text-xl font-medium text-[#245b46] disabled:cursor-not-allowed disabled:text-black/20">−</button><output aria-label={`${label}数量`} className="min-w-12 flex-1 text-center text-lg font-bold tabular-nums">{value}</output><button type="button" aria-label={`增加${label}数量`} disabled={value >= max} onClick={() => onChange(value + 1)} className="focus-ring grid h-12 w-12 shrink-0 place-items-center text-xl font-medium text-[#245b46] disabled:cursor-not-allowed disabled:text-black/20">＋</button></div></div>;
}

export function TripForm() {
  const router = useRouter();
  const minDate = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [destination, setDestination] = useState("");
  const [days, setDays] = useState(3);
  const [customDaysOpen, setCustomDaysOpen] = useState(false);
  const [style, setStyle] = useState<TripInput["travelStyle"]>("slow");
  const [dateType, setDateType] = useState<TripInput["datePreference"]["type"]>("undecided");
  const [startDate, setStartDate] = useState("");
  const [approximateText, setApproximateText] = useState("");
  const [budgetMode, setBudgetMode] = useState<TripInput["budget"]["mode"]>("unrestricted");
  const [budgetAmount, setBudgetAmount] = useState(3000);
  const [budgetScope, setBudgetScope] = useState<"total" | "per_person">("total");
  const [includesAccommodation, setIncludesAccommodation] = useState(true);
  const [includesIntercity, setIncludesIntercity] = useState(false);
  const [priorities, setPriorities] = useState<TripInput["priorities"]>([]);
  const [departureCity, setDepartureCity] = useState("");
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [transport, setTransport] = useState<TripInput["transportPreference"]>("mixed");
  const [dayTrip, setDayTrip] = useState(false);
  const [requirements, setRequirements] = useState("");
  const [error, setError] = useState("");

  useEffect(() => { queueMicrotask(() => {
    try {
      const stored = migrateTripInput(JSON.parse(localStorage.getItem(INPUT_KEY) || localStorage.getItem(LEGACY_INPUT_KEY) || "null"));
      if (!stored) return;
      setDestination(stored.destination.city); setDays(stored.days); setCustomDaysOpen(stored.days > 3); setStyle(stored.travelStyle);
      setDateType(stored.datePreference.type); setStartDate(stored.datePreference.startDate || ""); setApproximateText(stored.datePreference.approximateText || "");
      setBudgetMode(stored.budget.mode); if (stored.budget.amount) setBudgetAmount(stored.budget.amount); if (stored.budget.scope) setBudgetScope(stored.budget.scope);
      if (stored.budget.includesAccommodation !== null) setIncludesAccommodation(stored.budget.includesAccommodation);
      if (stored.budget.includesIntercityTransport !== null) setIncludesIntercity(stored.budget.includesIntercityTransport);
      setPriorities(stored.priorities); setDepartureCity(stored.departureCity || ""); setAdults(stored.travelers.adults); setChildren(stored.travelers.children);
      setTransport(stored.transportPreference); setDayTrip(stored.dayTripPreference); setRequirements(stored.additionalRequirements || "");
    } catch { /* ignore invalid legacy cache */ }
  }); }, []);

  function togglePriority(value: TripInput["priorities"][number]) {
    setError("");
    setPriorities((current) => current.includes(value) ? current.filter((item) => item !== value) : current.length < 3 ? [...current, value] : current);
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    const customBudget = budgetMode === "custom";
    const input = {
      schemaVersion: "0.2",
      destination: { city: destination, country: "中国" }, days, travelStyle: style,
      datePreference: { type: dateType, startDate: dateType === "exact" ? startDate || null : null, approximateText: dateType === "approximate" ? approximateText || null : null },
      budget: { mode: budgetMode, amount: customBudget ? budgetAmount : null, scope: customBudget ? budgetScope : null, includesAccommodation: customBudget ? includesAccommodation : null, includesIntercityTransport: customBudget ? includesIntercity : null, currency: "CNY" },
      priorities, departureCity: departureCity || null, travelers: { adults, children }, transportPreference: transport,
      dayTripPreference: dayTrip, additionalRequirements: requirements || null,
    } satisfies TripInput;
    const result = tripInputSchema.safeParse(input);
    if (!result.success) { setError(result.error.issues[0]?.message ?? "请检查填写内容"); return; }
    window.localStorage.setItem(INPUT_KEY, JSON.stringify(result.data));
    window.localStorage.setItem(LEGACY_INPUT_KEY, JSON.stringify(result.data));
    window.localStorage.removeItem("wandernote:generated-plan");
    window.localStorage.removeItem("wandernote:last-undo");
    router.push("/generating");
  }

  return <form onSubmit={submit} className="space-y-6">
    <section className="card rounded-[2rem] p-5 sm:p-8">
      <label className={`block ${coreQuestionClass}`}>你想去哪里？ <span className="text-[#c55e3d]">*</span><input id="trip-destination" required value={destination} onChange={(event) => setDestination(event.target.value)} className={`${inputClass} font-normal tracking-normal`} placeholder="例如：杭州" /></label>
      <div className="mt-4 rounded-2xl bg-[#f4f5f0] p-4"><p className="text-xs font-bold text-[#617068]">旅行灵感 · 固定示例</p><div className="mt-3 space-y-3">{travelInspirations.map((group) => <div key={group.category} className="flex items-center gap-2 overflow-x-auto"><span className="w-20 shrink-0 text-xs text-[#7b847e]">{group.category}</span>{group.cities.map((city) => <button key={city} type="button" onClick={() => setDestination(city)} className="focus-ring shrink-0 rounded-full border border-black/8 bg-white px-3 py-1.5 text-sm font-semibold hover:border-[#245b46]/40">{city}</button>)}</div>)}</div></div>
      <DestinationRecommender days={days} departureCity={departureCity} onDepartureCity={setDepartureCity} onChoose={setDestination} />

      <div className="mt-8"><p className={coreQuestionClass}>准备玩几天？ <span className="text-[#c55e3d]">*</span></p><div className="mt-3 grid grid-cols-4 gap-1.5 sm:gap-2">{[1, 2, 3].map((value) => <button key={value} type="button" aria-pressed={!customDaysOpen && days === value} onClick={() => { setDays(value); setCustomDaysOpen(false); }} className={`focus-ring min-w-0 rounded-xl border px-1 py-3 font-bold transition ${!customDaysOpen && days === value ? selectedCard : plainCard}`}>{value}天</button>)}<button type="button" aria-pressed={customDaysOpen} onClick={() => { setCustomDaysOpen(true); if (days <= 3) setDays(4); }} className={`focus-ring min-w-0 rounded-xl border px-1 py-3 font-bold transition ${customDaysOpen ? selectedCard : plainCard}`}>{customDaysOpen ? `${days}天` : "自定义"}</button></div>{customDaysOpen && <label className="mt-3 block text-sm font-semibold">自定义天数（1～7天）<input type="number" inputMode="numeric" min="1" max="7" value={days} onChange={(event) => setDays(Math.min(7, Math.max(1, Number(event.target.value) || 1)))} className={`${inputClass} max-w-40`} /></label>}</div>

      <div className="mt-8"><p className={coreQuestionClass}>想怎么玩？ <span className="text-[#c55e3d]">*</span></p><div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{travelStyles.map((item) => <button key={item.value} type="button" aria-pressed={style === item.value} onClick={() => setStyle(item.value)} className={`focus-ring rounded-2xl border p-4 text-left transition ${style === item.value ? selectedCard : plainCard}`}><span className="inline-flex h-6 w-6 items-center justify-center text-xl">{item.value === "romantic" ? <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-5 w-5 text-[#b76c68]"><path d="M20.8 5.8c-1.9-1.9-5-1.9-6.9 0L12 7.7l-1.9-1.9a4.88 4.88 0 0 0-6.9 6.9L12 21l8.8-8.3a4.88 4.88 0 0 0 0-6.9Z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg> : item.icon}</span><span className="ml-3 font-bold">{item.label}</span><p className="ml-9 mt-1 text-xs text-[#707a74]">{item.description}</p></button>)}</div></div>
    </section>

    <details className="card group rounded-[2rem] p-5 sm:p-8">
      <summary className="focus-ring flex cursor-pointer list-none items-center justify-between rounded-xl"><div><h2 className="text-xl font-bold">补充更多需求，让攻略更懂你</h2><p className="mt-1 text-sm text-[#707a74]">全部选填，不影响直接生成</p></div><span className="text-2xl text-[#245b46] transition group-open:rotate-45">＋</span></summary>
      <div className="mt-8 space-y-9 border-t border-black/5 pt-8">
        <section><h3 className="font-bold">出行时间</h3><div className="mt-3 grid grid-cols-3 gap-1.5 sm:gap-2">{([['undecided','还没确定'],['approximate','大概时间'],['exact','已确定日期']] as const).map(([value,label]) => <button key={value} type="button" aria-pressed={dateType === value} onClick={() => setDateType(value)} className={`min-w-0 whitespace-nowrap rounded-xl border px-1.5 py-3 text-sm font-semibold sm:px-3 ${dateType === value ? selectedCard : plainCard}`}>{label}</button>)}</div>{dateType === "exact" && <label className="mt-4 block text-sm font-semibold">具体日期<input type="date" min={minDate} value={startDate} onChange={(event) => setStartDate(event.target.value)} className={inputClass} /></label>}{dateType === "approximate" && <label className="mt-4 block text-sm font-semibold">大概什么时候<input value={approximateText} onChange={(event) => setApproximateText(event.target.value)} className={inputClass} placeholder="例如：10月、秋天、国庆前后" /></label>}</section>

        <section><h3 className="font-bold">预算偏好</h3><div className="mt-3 grid grid-cols-2 gap-2">{budgetModes.map((item, index) => <button key={item.value} type="button" aria-pressed={budgetMode === item.value} onClick={() => setBudgetMode(item.value)} className={`rounded-xl border px-3 py-3 text-center text-sm font-bold ${index === budgetModes.length - 1 ? "col-span-2" : ""} ${budgetMode === item.value ? selectedCard : plainCard}`}>{item.label}</button>)}</div>{budgetMode === "custom" && <div className="mt-4 grid gap-4 rounded-2xl bg-[#f4f5f0] p-4 sm:grid-cols-2"><label className="text-sm font-semibold">金额（元）<input type="number" min="100" step="100" value={budgetAmount} onChange={(event) => setBudgetAmount(Number(event.target.value))} className={inputClass} /></label><div className="text-sm font-semibold">预算口径<div className="mt-2 flex gap-2">{([['total','总预算'],['per_person','人均预算']] as const).map(([value,label]) => <button key={value} type="button" onClick={() => setBudgetScope(value)} className={`rounded-full border px-4 py-2 ${budgetScope === value ? selectedCard : plainCard}`}>{label}</button>)}</div></div><label className="flex items-center gap-3 text-sm font-semibold"><input type="checkbox" checked={includesAccommodation} onChange={(event) => setIncludesAccommodation(event.target.checked)} className="h-5 w-5 accent-[#245b46]" />包含住宿</label><label className="flex items-center gap-3 text-sm font-semibold"><input type="checkbox" checked={includesIntercity} onChange={(event) => setIncludesIntercity(event.target.checked)} className="h-5 w-5 accent-[#245b46]" />包含往返大交通</label></div>}</section>

        <section><div className="flex items-end justify-between"><div><h3 className="font-bold">这次最在意什么</h3><p className="mt-1 text-sm text-[#707a74]">最多选择3项</p></div><span className="text-sm font-bold text-[#245b46]">{priorities.length}/3</span></div><div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">{priorityOptions.map((item) => <button key={item.value} type="button" aria-pressed={priorities.includes(item.value)} onClick={() => togglePriority(item.value)} className={`rounded-xl border px-3 py-3 text-left text-sm font-semibold ${priorities.includes(item.value) ? selectedCard : plainCard}`}>{item.value === "late_start" ? <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="mr-2 inline h-4 w-4 align-[-2px] text-[#c98235]"><circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.7" /><path d="M12 8v4l2.7 1.7M5 5l1.5 1.5M19 5l-1.5 1.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg> : <span className="mr-2">{item.icon}</span>}{item.label}</button>)}</div></section>

        <section><h3 className="font-bold">同行与交通</h3><div className="mt-3 grid gap-4 sm:grid-cols-3"><label className="text-sm font-semibold">出发城市<input value={departureCity} onChange={(event) => setDepartureCity(event.target.value)} className={inputClass} placeholder="选填" /></label><NumberStepper label="成人" value={adults} min={1} max={8} onChange={setAdults} /><NumberStepper label="儿童" value={children} min={0} max={7} onChange={setChildren} /></div><div className="mt-4 flex flex-wrap gap-2">{transportOptions.map((item) => <button key={item.value} type="button" onClick={() => setTransport(item.value)} className={`min-h-11 rounded-full border px-4 py-2 text-[15px] font-semibold sm:text-base ${transport === item.value ? selectedCard : plainCard}`}>{item.label}</button>)}</div><label className="mt-4 flex items-center gap-3 text-sm font-semibold"><input type="checkbox" checked={dayTrip} onChange={(event) => setDayTrip(event.target.checked)} className="h-5 w-5 accent-[#245b46]" />愿意安排一次目的地周边一日游</label></section>

        <label className="block font-semibold">补充要求<textarea value={requirements} maxLength={300} onChange={(event) => setRequirements(event.target.value)} className={`${inputClass} min-h-24 resize-y`} placeholder="例如：不想太早起、需要午休、避免爬坡……" /></label>
      </div>
    </details>

    {error && <p role="alert" className="rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</p>}
    <div className="sticky bottom-3 z-10 rounded-[1.6rem] border border-black/5 bg-[#f7f8f3]/90 p-3 shadow-xl backdrop-blur sm:static sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none"><button className="focus-ring w-full whitespace-nowrap rounded-full bg-[#245b46] px-4 py-4 text-base font-bold text-white shadow-lg shadow-[#245b46]/15 hover:bg-[#1c4937] sm:px-8 sm:text-lg">一键生成我的定制旅行</button></div>
    <BrandMark align="center" size="compact" className="flex justify-center opacity-80" />
    <p className="text-center text-xs leading-5 text-[#778079]">AI规划不含实时天气、票价或营业数据，出发前请再次确认。</p>
  </form>;
}
