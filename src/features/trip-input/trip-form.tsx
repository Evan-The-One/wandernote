"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { budgetModes, companionOptions, priorityOptions, transportOptions, travelStyles } from "./options";
import { travelInspirations } from "./inspirations";
import { tripInputSchema } from "@/schemas/trip";
import type { TripInput } from "@/types/trip";
import { migrateTripInput } from "@/schemas/migration";
import { DestinationRecommender } from "./destination-recommender";
import { trackEvent } from "@/features/analytics/client";

const LEGACY_INPUT_KEY = "wandernote:demo-input";
const INPUT_KEY = "yijianchufa:trip-input";

const inputClass = "focus-ring mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-base shadow-sm placeholder:text-black/30";
const selectedCard = "border-[#245b46] bg-[#eaf2ed] text-[#183b2e] shadow-sm";
const plainCard = "border-black/8 bg-white hover:border-[#245b46]/40";
const coreQuestionClass = "text-xl font-semibold tracking-tight sm:text-2xl";

function NumberStepper({ label, value, min, max, onChange }: { label: "成人" | "儿童" | "老人"; value: number; min: number; max: number; onChange: (value: number) => void }) {
  return <div><p className="text-sm font-semibold">{label}数量</p><div className="mt-2 flex h-12 items-center overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm"><button type="button" aria-label={`减少${label}数量`} disabled={value <= min} onClick={() => onChange(value - 1)} className="focus-ring grid h-12 w-12 shrink-0 place-items-center text-xl font-medium text-[#245b46] disabled:cursor-not-allowed disabled:text-black/20">−</button><output aria-label={`${label}数量`} className="min-w-12 flex-1 text-center text-lg font-bold tabular-nums">{value}</output><button type="button" aria-label={`增加${label}数量`} disabled={value >= max} onClick={() => onChange(value + 1)} className="focus-ring grid h-12 w-12 shrink-0 place-items-center text-xl font-medium text-[#245b46] disabled:cursor-not-allowed disabled:text-black/20">＋</button></div></div>;
}

function ChoiceIcon({ name }: { name: string }) {
  const common = "h-5 w-5";
  if (name === "bolt") return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className={common}><path d="m13.5 2-8 12h6L10.5 22l8-12h-6l1-8Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" /></svg>;
  if (name === "leaf" || name === "nature") return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className={common}><path d="M20 4C11 4 5 8 5 15c0 3 2 5 5 5 7 0 10-7 10-16ZM4 21c2-5 6-8 11-11" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>;
  if (name === "cloud") return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className={common}><path d="M7 18h10a4 4 0 0 0 .5-8A6 6 0 0 0 6 9a4.5 4.5 0 0 0 1 9Z" stroke="currentColor" strokeWidth="1.7" /></svg>;
  if (name === "camera") return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className={common}><path d="M4 8h3l1.5-2h7L17 8h3v11H4V8Z" stroke="currentColor" strokeWidth="1.7" /><circle cx="12" cy="13" r="3" stroke="currentColor" strokeWidth="1.7" /></svg>;
  if (name === "culture") return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className={common}><path d="m3 9 9-5 9 5M5 10v7m4-7v7m6-7v7m4-7v7M3 20h18" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>;
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className={common}><path d="M6 8h12M7 8c0 6 2 10 5 10s5-4 5-10M9 5h6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>;
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
  const [companionType, setCompanionType] = useState<TripInput["companionType"]>("solo");
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [seniors, setSeniors] = useState(0);
  const [extendedFamily, setExtendedFamily] = useState({ adults: 2, children: 0, seniors: 0 });
  const [wakeTime, setWakeTime] = useState("");
  const [departureTime, setDepartureTime] = useState("");
  const [transport, setTransport] = useState<TripInput["transportPreference"]>("mixed");
  const [dayTrip, setDayTrip] = useState(false);
  const [requirements, setRequirements] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [inspirationsExpanded,setInspirationsExpanded]=useState(false);
  const [clearConfirm,setClearConfirm]=useState(false);
  const [toast,setToast]=useState("");
  const [recommenderRequest,setRecommenderRequest]=useState(0);

  useEffect(() => { queueMicrotask(() => {
    try {
      const stored = migrateTripInput(JSON.parse(localStorage.getItem(INPUT_KEY) || localStorage.getItem(LEGACY_INPUT_KEY) || "null"));
      if (!stored) return;
      setDestination(stored.destination.city); setDays(stored.days); setCustomDaysOpen(stored.days > 3); setStyle(stored.travelStyle);
      setDateType(stored.datePreference.type); setStartDate(stored.datePreference.startDate || ""); setApproximateText(stored.datePreference.approximateText || "");
      setBudgetMode(stored.budget.mode); if (stored.budget.amount) setBudgetAmount(stored.budget.amount); if (stored.budget.scope) setBudgetScope(stored.budget.scope);
      if (stored.budget.includesAccommodation !== null) setIncludesAccommodation(stored.budget.includesAccommodation);
      if (stored.budget.includesIntercityTransport !== null) setIncludesIntercity(stored.budget.includesIntercityTransport);
      setPriorities(stored.priorities); setDepartureCity(stored.departureCity || ""); setCompanionType(stored.companionType); setAdults(stored.travelers.adults); setChildren(stored.travelers.children); setSeniors(stored.travelers.seniors); if (stored.companionType === "extended_family") setExtendedFamily(stored.travelers);
      setWakeTime(stored.preferredWakeTime || ""); setDepartureTime(stored.preferredDepartureTime || "");
      setTransport(stored.transportPreference); setDayTrip(stored.dayTripPreference); setRequirements(stored.additionalRequirements || "");
    } catch { /* ignore invalid legacy cache */ }
  }); }, []);

  useEffect(()=>{const pending=sessionStorage.getItem("yijianchufa:pending-home-action");if(pending)sessionStorage.removeItem("yijianchufa:pending-home-action");const action=pending||new URLSearchParams(location.search).get("homeAction");queueMicrotask(()=>{if(action==="clear-trip-input")setClearConfirm(true);if(action==="choose-destination"){setInspirationsExpanded(true);setRecommenderRequest(value=>value+1)}})},[]);

  function clearForm(){setDestination("");setDays(3);setCustomDaysOpen(false);setStyle("slow");setDateType("undecided");setStartDate("");setApproximateText("");setBudgetMode("unrestricted");setBudgetAmount(3000);setBudgetScope("total");setIncludesAccommodation(true);setIncludesIntercity(false);setPriorities([]);setDepartureCity("");setCompanionType("solo");setAdults(1);setChildren(0);setSeniors(0);setExtendedFamily({adults:2,children:0,seniors:0});setWakeTime("");setDepartureTime("");setTransport("mixed");setDayTrip(false);setRequirements("");setInspirationsExpanded(false);setError("");localStorage.removeItem(INPUT_KEY);localStorage.removeItem(LEGACY_INPUT_KEY);const details=document.getElementById("trip-extras") as HTMLDetailsElement|null;if(details)details.open=false;setClearConfirm(false);setToast("已清空当前选择");setTimeout(()=>setToast(""),1800);document.getElementById("trip-destination")?.focus();}

  function togglePriority(value: TripInput["priorities"][number]) {
    setError("");
    setPriorities((current) => current.includes(value) ? current.filter((item) => item !== value) : current.length < 2 ? [...current, value] : (setError("最多选择两个偏好，更多请在下方补充信息添加"), current));
  }

  function selectCompanion(value: TripInput["companionType"]) {
    if (companionType === "extended_family") setExtendedFamily({ adults, children, seniors });
    setCompanionType(value);
    const defaults = { solo: [1, 0, 0], friends: [2, 0, 0], couple: [2, 0, 0], parents: [1, 0, 2], with_children: [2, 1, 0], extended_family: [2, 0, 0] } as const;
    const [nextAdults, nextChildren, nextSeniors] = value === "extended_family" ? [extendedFamily.adults, extendedFamily.children, extendedFamily.seniors] : defaults[value]; setAdults(nextAdults); setChildren(nextChildren); setSeniors(nextSeniors);
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if (submitting) return;
    const customBudget = budgetMode === "custom";
    const input = {
      schemaVersion: "0.2",
      destination: { city: destination, country: "中国" }, days, travelStyle: style,
      datePreference: { type: dateType, startDate: dateType === "exact" ? startDate || null : null, approximateText: dateType === "approximate" ? approximateText || null : null },
      budget: { mode: budgetMode, amount: customBudget ? budgetAmount : null, scope: customBudget ? budgetScope : null, includesAccommodation: customBudget ? includesAccommodation : null, includesIntercityTransport: customBudget ? includesIntercity : null, currency: "CNY" },
      priorities, departureCity: departureCity || null, companionType, travelers: { adults, children, seniors }, preferredWakeTime: wakeTime || null, preferredDepartureTime: departureTime || null, transportPreference: transport,
      dayTripPreference: dayTrip, additionalRequirements: requirements || null,
    } satisfies TripInput;
    const result = tripInputSchema.safeParse(input);
    if (!result.success) { setError(result.error.issues[0]?.message ?? "请检查填写内容"); setSubmitting(false); return; }
    setSubmitting(true); setError("");
    trackEvent("generate_clicked", { pageName:"home", metadata:{ style:result.data.travelStyle, days:result.data.days } });
    window.localStorage.setItem(INPUT_KEY, JSON.stringify(result.data));
    window.localStorage.setItem(LEGACY_INPUT_KEY, JSON.stringify(result.data));
    window.localStorage.removeItem("wandernote:generated-plan");
    window.localStorage.removeItem("wandernote:last-undo");
    window.setTimeout(() => router.push("/generating"), 80);
  }

  return <form onSubmit={submit} className="space-y-6">
    <section className="card rounded-[2rem] p-5 sm:p-8">
      <label className={`block ${coreQuestionClass}`}>你想去哪里？ <span className="text-[#c55e3d]">*</span><input id="trip-destination" required value={destination} onChange={(event) => setDestination(event.target.value)} className={`${inputClass} font-normal tracking-normal`} placeholder="例如：杭州" /></label>
      <div className="mt-4 rounded-2xl bg-[#f4f5f0] p-4"><p className="text-xs font-bold text-[#617068]">旅行灵感</p><div className="mt-3 space-y-3">{travelInspirations.slice(0,inspirationsExpanded?travelInspirations.length:2).map((group) => <div key={group.category} className="flex items-center gap-2 overflow-x-auto"><span className="w-20 shrink-0 text-xs text-[#7b847e]">{group.category}</span>{group.cities.map((city) => <button key={city} type="button" onClick={() => setDestination(city)} className="focus-ring shrink-0 rounded-full border border-black/8 bg-white px-3 py-1.5 text-sm font-semibold hover:border-[#245b46]/40">{city}</button>)}</div>)}</div><button id="trip-inspiration-expand" type="button" aria-expanded={inspirationsExpanded} onClick={()=>setInspirationsExpanded(value=>!value)} className="mt-3 text-sm font-bold text-[#245b46]">{inspirationsExpanded?"收起更多灵感":"展开更多灵感"}</button><div className={inspirationsExpanded?"":"hidden"}><DestinationRecommender openRequest={recommenderRequest} days={days} departureCity={departureCity} onDepartureCity={setDepartureCity} onChoose={setDestination} /></div></div>

      <div className="mt-8"><p className={coreQuestionClass}>准备玩几天？ <span className="text-[#c55e3d]">*</span></p><div className="mt-3 grid grid-cols-4 gap-1.5 sm:gap-2">{[1, 2, 3].map((value) => <button key={value} type="button" aria-pressed={!customDaysOpen && days === value} onClick={() => { setDays(value); setCustomDaysOpen(false); }} className={`focus-ring min-w-0 rounded-xl border px-1 py-3 font-bold transition ${!customDaysOpen && days === value ? selectedCard : plainCard}`}>{value}天</button>)}<button type="button" aria-pressed={customDaysOpen} onClick={() => { setCustomDaysOpen(true); if (days <= 3) setDays(4); }} className={`focus-ring min-w-0 rounded-xl border px-1 py-3 font-bold transition ${customDaysOpen ? selectedCard : plainCard}`}>{customDaysOpen ? `${days}天` : "自定义"}</button></div>{customDaysOpen && <label className="mt-3 block text-sm font-semibold">自定义天数（1～7天）<input type="number" inputMode="numeric" min="1" max="7" value={days} onChange={(event) => setDays(Math.min(7, Math.max(1, Number(event.target.value) || 1)))} className={`${inputClass} max-w-40`} /></label>}</div>

      <div className="mt-8"><p className={coreQuestionClass}>第三步，选一种喜欢的玩法 <span className="text-[#c55e3d]">*</span></p><div className="mt-4 space-y-6"><section><h3 className="font-bold">想怎么玩？</h3><p className="mt-1 text-xs text-[#707a74]">选择整体旅行节奏</p><div className="mt-3 grid gap-2 sm:grid-cols-3">{travelStyles.map((item) => <button key={item.value} type="button" aria-pressed={style === item.value} onClick={() => setStyle(item.value)} className={`focus-ring rounded-2xl border p-3 text-left transition ${style === item.value ? selectedCard : plainCard}`}><span className="inline-flex text-[#b98638]"><ChoiceIcon name={item.icon} /></span><span className="ml-2 font-bold">{item.label}</span><p className="mt-2 text-xs leading-5 text-[#707a74]">{item.description}</p></button>)}</div></section><section className="border-t border-black/5 pt-6"><div className="flex items-end justify-between"><div><h3 className="font-bold">这次更想要什么？</h3><p className="mt-1 text-xs text-[#707a74]">最多选2项，也可以不选</p></div><span className="text-sm font-bold text-[#245b46]">{priorities.length}/2</span></div><div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">{priorityOptions.map((item) => <button key={item.value} type="button" aria-pressed={priorities.includes(item.value)} onClick={() => togglePriority(item.value)} className={`rounded-xl border px-3 py-3 text-left text-sm font-semibold ${priorities.includes(item.value) ? selectedCard : plainCard}`}><span className="mr-2 inline-flex align-[-5px] text-[#b98638]"><ChoiceIcon name={item.icon} /></span>{item.label}</button>)}</div></section></div></div>
    </section>

    <details id="trip-extras" className="card group rounded-[2rem] p-3 sm:p-4">
      <summary className="focus-ring flex min-h-20 cursor-pointer list-none items-center justify-between gap-4 rounded-2xl border border-[#245b46]/12 bg-[#f4f7f2] px-4 py-3 shadow-sm transition hover:border-[#245b46]/25"><div><h2 className="text-lg font-bold group-open:hidden">补充更多需求，让攻略更懂你</h2><h2 className="hidden text-lg font-bold group-open:block">收起补充需求</h2><p className="mt-1 text-sm text-[#707a74]">日期、人数、预算等均可选填</p></div><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-6 w-6 shrink-0 text-[#245b46] transition-transform duration-200 group-open:rotate-180"><path d="m7 9 5 5 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg></summary>
      <div className="mt-8 space-y-9 border-t border-black/5 pt-8">
        <section><h3 className="font-bold">和谁一起？</h3><p className="mt-1 text-sm text-[#707a74]">选填，帮助我们调整节奏与便利性</p><div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-6">{companionOptions.map((item) => <button key={item.value} type="button" aria-pressed={companionType === item.value} onClick={() => selectCompanion(item.value)} className={`min-h-11 rounded-xl border px-1.5 py-2 text-sm font-semibold ${companionType === item.value ? selectedCard : plainCard}`}>{item.label}</button>)}</div><div className={`mt-4 grid gap-3 ${companionType === "extended_family" ? "grid-cols-1 sm:grid-cols-3" : "grid-cols-2"}`}><NumberStepper label="成人" value={adults} min={1} max={8} onChange={setAdults} /><NumberStepper label="儿童" value={children} min={0} max={7} onChange={setChildren} />{companionType === "extended_family" && <NumberStepper label="老人" value={seniors} min={0} max={7} onChange={setSeniors} />}</div></section>

        <section><h3 className="font-bold">作息偏好</h3><p className="mt-1 text-sm text-[#707a74]">选填，具体时间会优先用于每天安排</p><div className="mt-3 grid grid-cols-2 gap-3"><label className="text-sm font-semibold">大概几点起床<select value={wakeTime} onChange={(event) => setWakeTime(event.target.value)} className={inputClass}><option value="">不限制</option>{Array.from({ length: 21 }, (_, index) => { const total = 360 + index * 30; const time = `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`; return <option key={time} value={time}>{time}</option>; })}</select></label><label className="text-sm font-semibold">希望几点出门<select value={departureTime} onChange={(event) => setDepartureTime(event.target.value)} className={inputClass}><option value="">不限制</option>{Array.from({ length: 21 }, (_, index) => { const total = 360 + index * 30; const time = `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`; return <option key={time} value={time}>{time}</option>; })}</select></label></div></section>
        <section><h3 className="font-bold">出行时间</h3><div className="mt-3 grid grid-cols-3 gap-1.5 sm:gap-2">{([['undecided','还没确定'],['approximate','大概时间'],['exact','已确定日期']] as const).map(([value,label]) => <button key={value} type="button" aria-pressed={dateType === value} onClick={() => setDateType(value)} className={`min-w-0 whitespace-nowrap rounded-xl border px-1.5 py-3 text-sm font-semibold sm:px-3 ${dateType === value ? selectedCard : plainCard}`}>{label}</button>)}</div>{dateType === "exact" && <label className="mt-4 block text-sm font-semibold">具体日期<input type="date" min={minDate} value={startDate} onChange={(event) => setStartDate(event.target.value)} className={inputClass} /></label>}{dateType === "approximate" && <label className="mt-4 block text-sm font-semibold">大概什么时候<input value={approximateText} onChange={(event) => setApproximateText(event.target.value)} className={inputClass} placeholder="例如：10月、秋天、国庆前后" /></label>}</section>

        <section><h3 className="font-bold">预算偏好</h3><div className="mt-3 grid grid-cols-2 gap-2">{budgetModes.map((item, index) => <button key={item.value} type="button" aria-pressed={budgetMode === item.value} onClick={() => setBudgetMode(item.value)} className={`rounded-xl border px-3 py-3 text-center text-sm font-bold ${index === budgetModes.length - 1 ? "col-span-2" : ""} ${budgetMode === item.value ? selectedCard : plainCard}`}>{item.label}</button>)}</div>{budgetMode === "custom" && <div className="mt-4 grid gap-4 rounded-2xl bg-[#f4f5f0] p-4 sm:grid-cols-2"><label className="text-sm font-semibold">金额（元）<input type="number" min="100" step="100" value={budgetAmount} onChange={(event) => setBudgetAmount(Number(event.target.value))} className={inputClass} /></label><div className="text-sm font-semibold">预算口径<div className="mt-2 flex gap-2">{([['total','总预算'],['per_person','人均预算']] as const).map(([value,label]) => <button key={value} type="button" onClick={() => setBudgetScope(value)} className={`rounded-full border px-4 py-2 ${budgetScope === value ? selectedCard : plainCard}`}>{label}</button>)}</div></div><label className="flex items-center gap-3 text-sm font-semibold"><input type="checkbox" checked={includesAccommodation} onChange={(event) => setIncludesAccommodation(event.target.checked)} className="h-5 w-5 accent-[#245b46]" />包含住宿</label><label className="flex items-center gap-3 text-sm font-semibold"><input type="checkbox" checked={includesIntercity} onChange={(event) => setIncludesIntercity(event.target.checked)} className="h-5 w-5 accent-[#245b46]" />包含往返大交通</label></div>}</section>

        <section><h3 className="font-bold">出发地与交通</h3><label className="mt-3 block text-sm font-semibold">出发城市<input value={departureCity} onChange={(event) => setDepartureCity(event.target.value)} className={inputClass} placeholder="选填" /></label><div className="mt-4 flex flex-wrap gap-2">{transportOptions.map((item) => <button key={item.value} type="button" onClick={() => setTransport(item.value)} className={`min-h-11 rounded-full border px-4 py-2 text-[15px] font-semibold sm:text-base ${transport === item.value ? selectedCard : plainCard}`}>{item.label}</button>)}</div><label className="mt-4 flex items-center gap-3 text-sm font-semibold"><input type="checkbox" checked={dayTrip} onChange={(event) => setDayTrip(event.target.checked)} className="h-5 w-5 accent-[#245b46]" />愿意安排一次目的地周边一日游</label></section>

        <label className="block font-semibold">补充要求<textarea value={requirements} maxLength={300} onChange={(event) => setRequirements(event.target.value)} className={`${inputClass} min-h-24 resize-y`} placeholder="例如：不想太早起、需要午休、避免爬坡……" /></label>
      </div>
    </details>

    {error && <p role="alert" className="rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</p>}
    <div className="sticky bottom-3 z-10 rounded-[1.6rem] border border-black/5 bg-[#f7f8f3]/90 p-3 shadow-xl backdrop-blur sm:static sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none"><button type="submit" disabled={submitting} aria-live="polite" className="focus-ring flex w-full items-center justify-center gap-2 whitespace-nowrap rounded-full bg-[#245b46] px-4 py-4 text-base font-bold text-white shadow-lg shadow-[#245b46]/15 transition active:scale-[.99] disabled:cursor-wait disabled:bg-[#3f7661] sm:px-8 sm:text-lg">{submitting && <span aria-hidden="true" className="h-4 w-4 animate-spin rounded-full border-2 border-white/35 border-t-white" />}{submitting ? "正在准备你的旅行……" : "一键生成我的定制旅行"}</button></div>
    <p className="text-center text-xs leading-5 text-[#778079]">AI规划不含实时天气、票价或营业数据，出发前请再次确认。</p>
    {toast&&<p role="status" className="text-right text-sm font-semibold text-[#245b46]">{toast}</p>}
    {clearConfirm&&<div className="fixed inset-0 z-[60] grid place-items-center bg-black/30 p-5" role="dialog" aria-modal="true"><div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl"><h2 className="text-xl font-bold">确定清空当前选择吗？</h2><p className="mt-2 text-sm text-[#65706a]">只清除首页草稿，不会删除已生成攻略。</p><div className="mt-6 flex justify-end gap-3"><button type="button" onClick={()=>setClearConfirm(false)} className="rounded-full border px-5 py-2.5 font-semibold">取消</button><button type="button" onClick={clearForm} className="rounded-full bg-[#a34838] px-5 py-2.5 font-semibold text-white">确认清空</button></div></div></div>}
  </form>;
}
