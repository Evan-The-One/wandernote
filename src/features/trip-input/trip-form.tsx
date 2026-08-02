"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  budgetModes,
  companionOptions,
  detailPreferenceOptions,
  priorityOptions,
  transportOptions,
  travelStyles,
} from "./options";
import { travelInspirations } from "./inspirations";
import { tripInputSchema } from "@/schemas/trip";
import type { TripInput } from "@/types/trip";
import { migrateTripInput } from "@/schemas/migration";
import { DestinationRecommender } from "./destination-recommender";
import { trackEvent } from "@/features/analytics/client";
import {
  identifyDestination,
  nearbyCityOptions,
  randomDestinationCities,
} from "./destination-config";

const LEGACY_INPUT_KEY = "wandernote:demo-input";
const INPUT_KEY = "yijianchufa:trip-input";

const inputClass =
  "focus-ring mt-2 min-h-12 w-full rounded-[var(--radius-control)] border border-[var(--border-soft)] bg-white px-4 py-3 text-base text-[var(--text-primary)] shadow-sm placeholder:text-[var(--text-muted)]";
const selectedCard = "border-[var(--brand-primary)] bg-[var(--brand-soft)] text-[var(--brand-primary-deep)] shadow-sm ring-1 ring-[var(--brand-primary)]/10";
const plainCard = "border-[var(--border-soft)] bg-white text-[var(--text-primary)] hover:border-[var(--brand-primary)]/45 hover:bg-[var(--background-soft)]";
const coreQuestionClass = "text-xl font-semibold tracking-[-.025em] text-[var(--text-strong)] sm:text-2xl";

function NumberStepper({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: "成人" | "儿童" | "老人";
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <div>
      <p className="text-sm font-semibold">{label}数量</p>
      <div className="mt-2 flex h-12 items-center overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm">
        <button
          type="button"
          aria-label={`减少${label}数量`}
          disabled={value <= min}
          onClick={() => onChange(value - 1)}
          className="focus-ring grid h-12 w-12 shrink-0 place-items-center text-xl font-medium text-[#245b46] disabled:cursor-not-allowed disabled:text-black/20"
        >
          −
        </button>
        <output
          aria-label={`${label}数量`}
          className="min-w-12 flex-1 text-center text-lg font-bold tabular-nums"
        >
          {value}
        </output>
        <button
          type="button"
          aria-label={`增加${label}数量`}
          disabled={value >= max}
          onClick={() => onChange(value + 1)}
          className="focus-ring grid h-12 w-12 shrink-0 place-items-center text-xl font-medium text-[#245b46] disabled:cursor-not-allowed disabled:text-black/20"
        >
          ＋
        </button>
      </div>
    </div>
  );
}

function ChoiceIcon({ name }: { name: string }) {
  const common = "h-5 w-5";
  if (name === "bolt")
    return (
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="none"
        className={common}
      >
        <path
          d="m13.5 2-8 12h6L10.5 22l8-12h-6l1-8Z"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinejoin="round"
        />
      </svg>
    );
  if (name === "leaf" || name === "nature")
    return (
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="none"
        className={common}
      >
        <path
          d="M20 4C11 4 5 8 5 15c0 3 2 5 5 5 7 0 10-7 10-16ZM4 21c2-5 6-8 11-11"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
      </svg>
    );
  if (name === "cloud")
    return (
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="none"
        className={common}
      >
        <path
          d="M7 18h10a4 4 0 0 0 .5-8A6 6 0 0 0 6 9a4.5 4.5 0 0 0 1 9Z"
          stroke="currentColor"
          strokeWidth="1.7"
        />
      </svg>
    );
  if (name === "camera")
    return (
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="none"
        className={common}
      >
        <path
          d="M4 8h3l1.5-2h7L17 8h3v11H4V8Z"
          stroke="currentColor"
          strokeWidth="1.7"
        />
        <circle cx="12" cy="13" r="3" stroke="currentColor" strokeWidth="1.7" />
      </svg>
    );
  if (name === "culture")
    return (
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="none"
        className={common}
      >
        <path
          d="m3 9 9-5 9 5M5 10v7m4-7v7m6-7v7m4-7v7M3 20h18"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
      </svg>
    );
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className={common}>
      <path
        d="M6 8h12M7 8c0 6 2 10 5 10s5-4 5-10M9 5h6"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function TripForm() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const destinationRef = useRef<HTMLInputElement>(null);
  const minDate = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [destination, setDestination] = useState("");
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [destinationSelection, setDestinationSelection] = useState<
    TripInput["destination"] | null
  >(null);
  const [days, setDays] = useState(3);
  const [customDaysText, setCustomDaysText] = useState("4");
  const [daysError, setDaysError] = useState("");
  const [customDaysOpen, setCustomDaysOpen] = useState(false);
  const [style, setStyle] = useState<TripInput["travelStyle"]>("slow");
  const [dateType, setDateType] =
    useState<TripInput["datePreference"]["type"]>("undecided");
  const [startDate, setStartDate] = useState("");
  const [approximateText, setApproximateText] = useState("");
  const [budgetMode, setBudgetMode] =
    useState<TripInput["budget"]["mode"]>("unrestricted");
  const [budgetAmount, setBudgetAmount] = useState(3000);
  const [budgetError, setBudgetError] = useState("");
  const [budgetScope, setBudgetScope] = useState<"total" | "per_person">(
    "total",
  );
  const [includesAccommodation, setIncludesAccommodation] = useState(true);
  const [includesIntercity, setIncludesIntercity] = useState(false);
  const [priorities, setPriorities] = useState<TripInput["priorities"]>([]);
  const [detailPreferences, setDetailPreferences] = useState<
    TripInput["detailPreferences"]
  >([]);
  const [detailOpen, setDetailOpen] = useState(false);
  const [departureCity, setDepartureCity] = useState("");
  const [companionType, setCompanionType] =
    useState<TripInput["companionType"]>("undecided");
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [seniors, setSeniors] = useState(0);
  const [extendedFamily, setExtendedFamily] = useState({
    adults: 2,
    children: 0,
    seniors: 0,
  });
  const [wakeTime, setWakeTime] = useState("");
  const [departureTime, setDepartureTime] = useState("");
  const [transport, setTransport] =
    useState<TripInput["transportPreference"]>("mixed");
  const [dayTrip, setDayTrip] = useState(false);
  const [requirements, setRequirements] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [generationAccessMode, setGenerationAccessMode] = useState<
    "normal" | "tester_unlimited"
  >("normal");
  const [inspirationsExpanded, setInspirationsExpanded] = useState(false);
  const [clearConfirm, setClearConfirm] = useState(false);
  const [toast, setToast] = useState("");
  const [recommenderRequest, setRecommenderRequest] = useState(0);
  const [provinceConfirm, setProvinceConfirm] = useState<ReturnType<
    typeof identifyDestination
  > | null>(null);
  const [longCityConfirm, setLongCityConfirm] = useState<{
    city: string;
    nearby: string;
  } | null>(null);

  useEffect(()=>{
    if(step===1)return;
    const reduced=window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    requestAnimationFrame(()=>formRef.current?.scrollIntoView({behavior:reduced?"auto":"smooth",block:"start"}));
  },[step]);

  useEffect(() => {
    let active = true;
    const refreshAccess = () => {
      void fetch("/api/auth/session", { cache: "no-store" })
        .then((response) => (response.ok ? response.json() : null))
        .then((payload) => {
          if (active && payload?.generationAccessMode === "tester_unlimited")
            setGenerationAccessMode("tester_unlimited");
          else if (active) setGenerationAccessMode("normal");
        })
        .catch(() => undefined);
    };
    refreshAccess();
    window.addEventListener("yjchufa-auth-changed", refreshAccess);
    return () => {
      active = false;
      window.removeEventListener("yjchufa-auth-changed", refreshAccess);
    };
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      try {
        const stored = migrateTripInput(
          JSON.parse(
            localStorage.getItem(INPUT_KEY) ||
              localStorage.getItem(LEGACY_INPUT_KEY) ||
              "null",
          ),
        );
        if (!stored) return;
        setDestination(stored.destination.city);
        setDestinationSelection(stored.destination);
        setDays(stored.days);
        setCustomDaysText(String(stored.days));
        setCustomDaysOpen(stored.days > 3);
        setStyle(stored.travelStyle);
        setDateType(stored.datePreference.type);
        setStartDate(stored.datePreference.startDate || "");
        setApproximateText(stored.datePreference.approximateText || "");
        setBudgetMode(stored.budget.mode === "economy" || stored.budget.mode === "custom" ? stored.budget.mode : "unrestricted");
        if (stored.budget.amount) setBudgetAmount(stored.budget.amount);
        if (stored.budget.scope) setBudgetScope(stored.budget.scope);
        if (stored.budget.includesAccommodation !== null)
          setIncludesAccommodation(stored.budget.includesAccommodation);
        if (stored.budget.includesIntercityTransport !== null)
          setIncludesIntercity(stored.budget.includesIntercityTransport);
        setPriorities(stored.priorities.slice(0, 2));
        setDetailPreferences(stored.detailPreferences);
        setDepartureCity(stored.departureCity || "");
        setCompanionType(stored.companionType);
        setAdults(stored.travelers.adults);
        setChildren(stored.travelers.children);
        setSeniors(stored.travelers.seniors);
        if (stored.companionType === "other")
          setExtendedFamily(stored.travelers);
        setWakeTime(stored.preferredWakeTime || "");
        setDepartureTime(stored.preferredDepartureTime || "");
        setTransport(stored.transportPreference);
        setDayTrip(stored.dayTripPreference);
        setRequirements(stored.additionalRequirements || "");
      } catch {
        /* ignore invalid legacy cache */
      }
    });
  }, []);

  useEffect(() => {
    const clear = () => setClearConfirm(true);
    const choose = () => {
      setInspirationsExpanded(true);
      setRecommenderRequest((value) => value + 1);
    };
    const returnToPlan = () => {
      document.getElementById("plan")?.scrollIntoView({ behavior: "smooth" });
      setTimeout(
        () => destinationRef.current?.focus({ preventScroll: true }),
        450,
      );
    };
    const pending = sessionStorage.getItem("yijianchufa:pending-home-action");
    if (pending) sessionStorage.removeItem("yijianchufa:pending-home-action");
    const action =
      pending || new URLSearchParams(location.search).get("homeAction");
    queueMicrotask(() => {
      if (action === "clear-trip-input") clear();
      if (action === "choose-destination") choose();
      if (action === "return-to-plan") returnToPlan();
    });
    window.addEventListener("clear-trip-input", clear);
    window.addEventListener("choose-destination", choose);
    window.addEventListener("return-to-plan", returnToPlan);
    return () => {
      window.removeEventListener("clear-trip-input", clear);
      window.removeEventListener("choose-destination", choose);
      window.removeEventListener("return-to-plan", returnToPlan);
    };
  }, []);

  function clearForm() {
    setDestination("");
    setDays(3);
    setCustomDaysText("4");
    setDaysError("");
    setCustomDaysOpen(false);
    setStyle("slow");
    setDateType("undecided");
    setStartDate("");
    setApproximateText("");
    setBudgetMode("unrestricted");
    setBudgetAmount(3000);
    setBudgetError("");
    setBudgetScope("total");
    setIncludesAccommodation(true);
    setIncludesIntercity(false);
    setPriorities([]);
    setDetailPreferences([]);
    setDepartureCity("");
    setCompanionType("undecided");
    setAdults(1);
    setChildren(0);
    setSeniors(0);
    setExtendedFamily({ adults: 2, children: 0, seniors: 0 });
    setWakeTime("");
    setDepartureTime("");
    setTransport("mixed");
    setDayTrip(false);
    setRequirements("");
    setInspirationsExpanded(false);
    setError("");
    localStorage.removeItem(INPUT_KEY);
    localStorage.removeItem(LEGACY_INPUT_KEY);
    const details = document.getElementById(
      "trip-extras",
    ) as HTMLDetailsElement | null;
    if (details) details.open = false;
    setClearConfirm(false);
    setToast("已清空当前选择");
    setTimeout(() => setToast(""), 1800);
    destinationRef.current?.focus();
  }

  function togglePriority(value: TripInput["priorities"][number]) {
    setError("");
    setPriorities((current) =>
      current.includes(value)
        ? current.filter((item) => item !== value)
        : current.length < 2
          ? [...current, value]
          : (setError("最多选择两个偏好，更多请在下方补充信息添加"), current),
    );
  }

  function toggleDetail(value: TripInput["detailPreferences"][number]) {
    setError("");
    setDetailPreferences((current) =>
      current.includes(value)
        ? current.filter((item) => item !== value)
        : current.length < 3
          ? [...current, value]
          : (setError("最多再选三个，其他要求可以写在补充说明里"), current),
    );
  }

  function selectCompanion(value: TripInput["companionType"]) {
    if (companionType === "other")
      setExtendedFamily({ adults, children, seniors });
    setCompanionType(value);
    const defaults: Partial<
      Record<TripInput["companionType"], readonly [number, number, number]>
    > = {
      undecided: [1, 0, 0],
      solo: [1, 0, 0],
      friends: [2, 0, 0],
      partner: [2, 0, 0],
      with_children: [2, 1, 0],
    };
    const [nextAdults, nextChildren, nextSeniors] =
      value === "other"
        ? [
            extendedFamily.adults,
            extendedFamily.children,
            extendedFamily.seniors,
          ]
        : defaults[value] || [adults, children, seniors];
    setAdults(nextAdults);
    setChildren(nextChildren);
    setSeniors(nextSeniors);
  }

  function startGeneration(destinationOverride?: TripInput["destination"]) {
    if (submitting) return;
    if (!Number.isInteger(days) || days < 1 || days > 7) { setDaysError("请输入1～7之间的整数天数"); return; }
    if (budgetMode === "custom" && (!Number.isFinite(budgetAmount) || budgetAmount <= 0 || budgetAmount > 1_000_000)) { setBudgetError("请输入1～1,000,000元之间的金额"); return; }
    const identified = identifyDestination(destination);
    const customBudget = budgetMode === "custom";
    const input = {
      schemaVersion: "0.2",
      destination: destinationOverride || {
        city: identified.normalizedName,
        country: "中国",
        type: identified.type,
        scope: "single_city",
        provinceName: identified.provinceName,
      },
      days,
      travelStyle: style,
      datePreference: {
        type: dateType,
        startDate: dateType === "exact" ? startDate || null : null,
        approximateText:
          dateType === "approximate" ? approximateText || null : null,
      },
      budget: {
        mode: budgetMode,
        amount: customBudget ? budgetAmount : null,
        scope: customBudget ? budgetScope : null,
        includesAccommodation: customBudget ? includesAccommodation : null,
        includesIntercityTransport: customBudget ? includesIntercity : null,
        currency: "CNY",
      },
      priorities,
      detailPreferences,
      departureCity: departureCity || null,
      companionType,
      travelers: { adults, children, seniors },
      preferredWakeTime: wakeTime || null,
      preferredDepartureTime: departureTime || null,
      transportPreference: transport,
      dayTripPreference: dayTrip,
      additionalRequirements: requirements || null,
    } satisfies TripInput;
    const result = tripInputSchema.safeParse(input);
    if (!result.success) {
      setError(result.error.issues[0]?.message ?? "请检查填写内容");
      setSubmitting(false);
      return;
    }
    setSubmitting(true);
    setError("");
    trackEvent("generate_clicked", {
      pageName: "home",
      metadata: { style: result.data.travelStyle, days: result.data.days },
    });
    window.localStorage.setItem(INPUT_KEY, JSON.stringify(result.data));
    window.localStorage.setItem(LEGACY_INPUT_KEY, JSON.stringify(result.data));
    window.localStorage.removeItem("wandernote:generated-plan");
    window.localStorage.removeItem("wandernote:last-undo");
    window.setTimeout(() => router.push("/generating"), 80);
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if(step===1){if(destination.trim())setStep(2);return;}
    if(step===2){setStep(3);return;}
    const identified = identifyDestination(destination);
    if (destinationSelection && destinationSelection.city === destination) {
      startGeneration(destinationSelection);
      return;
    }
    if (identified.type === "province") {
      setProvinceConfirm(identified);
      return;
    }
    if (days >= 6 && nearbyCityOptions[identified.normalizedName]) {
      setLongCityConfirm({
        city: identified.normalizedName,
        nearby: nearbyCityOptions[identified.normalizedName],
      });
      return;
    }
    startGeneration();
  }

  return (
    <form ref={formRef} data-step={step} onSubmit={submit} className="app-trip-form scroll-mt-3 space-y-3 sm:space-y-4">
      <div className="flex items-center justify-between px-1">
        <div><p className="text-sm font-bold text-[var(--brand-primary)]">{step} / 3</p><p className="mt-0.5 text-sm text-[var(--text-secondary)]">{step===1?"先选目的地":step===2?"再决定玩多久":"最后选个喜欢的玩法"}</p></div>
        <div className="flex gap-2" aria-label={`当前第${step}步，共3步`}>{[1,2,3].map(value=><i key={value} className={`h-2.5 rounded-full transition-all ${value===step?"w-8 bg-[var(--brand-primary)]":"w-2.5 bg-[var(--brand-soft)]"}`}/>)}</div>
      </div>
      <section className="app-card-primary p-4 sm:min-h-[420px] sm:p-7">
        {step===1&&<div className="animate-[planning-enter_.3s_ease-out]">
        <label className={`block ${coreQuestionClass}`}>
          去哪儿？ <span className="text-[#c55e3d]">*</span>
          <span className="mt-2 flex items-center gap-2">
            <input
              ref={destinationRef}
              id="trip-destination"
              required
              value={destination}
              onChange={(event) => setDestination(event.target.value)}
              className={`${inputClass} mt-0 min-w-0 flex-1 font-normal tracking-normal`}
              placeholder="例如：杭州"
            />
            <button
              type="button"
              onClick={() => {
                const candidates = randomDestinationCities.filter(
                  (city) => city !== destination,
                );
                const city =
                  candidates[Math.floor(Math.random() * candidates.length)] ||
                  randomDestinationCities[0];
                setDestination(city);
                setToast(`为你随机到了：${city}`);
                setTimeout(() => setToast(""), 1800);
              }}
              className="focus-ring mt-0 min-h-12 shrink-0 rounded-2xl border border-[#245b46]/20 bg-white px-4 text-sm font-bold text-[#245b46]"
            >
              随机
            </button>
          </span>
        </label>
        <div className="mt-4 rounded-2xl bg-[#f4f5f0] p-4">
          <p className="text-xs font-bold text-[#617068]">旅行灵感</p>
          <div className="mt-3 space-y-3">
            {travelInspirations
              .slice(0, inspirationsExpanded ? travelInspirations.length : 2)
              .map((group) => (
                <div
                  key={group.category}
                  className="flex items-center gap-2 overflow-x-auto"
                >
                  <span className="w-20 shrink-0 text-xs text-[#7b847e]">
                    {group.category}
                  </span>
                  {group.cities.slice(0,inspirationsExpanded?group.cities.length:3).map((city) => (
                    <button
                      key={city}
                      type="button"
                      onClick={() => setDestination(city)}
                      className="focus-ring shrink-0 rounded-full border border-black/8 bg-white px-3 py-1.5 text-sm font-semibold hover:border-[#245b46]/40"
                    >
                      {city}
                    </button>
                  ))}
                </div>
              ))}
          </div>
          <button
            id="trip-inspiration-expand"
            type="button"
            aria-expanded={inspirationsExpanded}
            onClick={() => setInspirationsExpanded((value) => !value)}
            className="mt-3 text-sm font-bold text-[#245b46]"
          >
            {inspirationsExpanded ? "收起更多灵感" : "展开更多灵感"}
          </button>
          <div className={inspirationsExpanded ? "" : "hidden"}>
            <DestinationRecommender
              openRequest={recommenderRequest}
              days={days}
              departureCity={departureCity}
              onDepartureCity={setDepartureCity}
              onChoose={setDestination}
            />
          </div>
        </div>
        <button type="button" disabled={!destination.trim()} onClick={()=>setStep(2)} className="step-next-button btn-primary mt-7 w-full px-5 py-3.5 disabled:opacity-45">选好了，继续</button>
        </div>}

        {step===2&&<div className="animate-[planning-enter_.3s_ease-out]">
          <p className={coreQuestionClass}>
            玩几天？ <span className="text-[#c55e3d]">*</span>
          </p>
          <div className="mt-3 grid grid-cols-4 gap-1.5 sm:gap-2">
            {[1, 2, 3].map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={!customDaysOpen && days === value}
                onClick={() => {
                  setDays(value);
                  setCustomDaysOpen(false);
                }}
                className={`focus-ring min-w-0 rounded-xl border px-1 py-3 font-bold transition ${!customDaysOpen && days === value ? selectedCard : plainCard}`}
              >
                {value}天
              </button>
            ))}
            <button
              type="button"
              aria-pressed={customDaysOpen}
              onClick={() => {
                setCustomDaysOpen(true);
                if (days <= 3) { setDays(4); setCustomDaysText("4"); }
              }}
              className={`focus-ring min-w-0 rounded-xl border px-1 py-3 font-bold transition ${customDaysOpen ? selectedCard : plainCard}`}
            >
              {customDaysOpen ? `${days}天` : "自定义"}
            </button>
          </div>
          {customDaysOpen && (
            <label className="mt-3 block text-sm font-semibold">
              自定义天数（1～7天）
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={customDaysText}
                onChange={(event) => { const value=event.target.value; if(!/^\d*$/.test(value)) return; setCustomDaysText(value); setDaysError(""); if(value!=="") setDays(Number(value)); }}
                onBlur={() => { const value=Number(customDaysText); if(!/^\d+$/.test(customDaysText)||!Number.isInteger(value)||value<1||value>7) setDaysError("请输入1～7之间的整数天数"); else { setDays(value); setDaysError(""); } }}
                className={`${inputClass} max-w-40`}
              />
              {daysError && <span className="mt-2 block text-xs font-semibold text-red-700">{daysError}</span>}
            </label>
          )}
          <div className="mt-8 grid grid-cols-[.72fr_1.28fr] gap-3"><button type="button" onClick={()=>setStep(1)} className="btn-secondary px-4">上一步</button><button type="button" onClick={()=>setStep(3)} className="btn-primary px-4">继续选玩法</button></div>
        </div>}

        {step===3&&<div className="animate-[planning-enter_.3s_ease-out]">
          <p className={coreQuestionClass}>
            想怎么玩？ <span className="text-[#c55e3d]">*</span>
          </p>
          <div className="mt-4 space-y-6">
            <section>
              <p className="text-sm text-[#707a74]">先选整体节奏，再加最多两个重点</p>
              <div className="mt-3 grid grid-cols-3 gap-2">
                {travelStyles.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    aria-pressed={style === item.value}
                    onClick={() => setStyle(item.value)}
                    className={`choice-card focus-ring relative min-h-20 rounded-2xl border p-2 text-center transition sm:p-3 sm:text-left ${style === item.value ? `${selectedCard} is-selected` : plainCard}`}
                  >
                    <span className={`choice-icon choice-icon-${item.icon}`}>
                      <ChoiceIcon name={item.icon} />
                    </span>
                    <span className="mt-1 block text-sm font-bold sm:ml-2 sm:mt-0 sm:inline">{item.label}</span>
                    <p className="mt-2 hidden text-xs leading-5 text-[#707a74] sm:block">
                      {item.description}
                    </p>
                  </button>
                ))}
              </div>
            </section>
            <section className="border-t border-black/5 pt-6">
              <div className="flex items-end justify-between">
                <div>
                  <h3 className="font-bold">这次更想要什么？</h3>
                  <p className="mt-1 text-xs text-[#707a74]">
                    最多选2项，也可以不选
                  </p>
                </div>
                <span className="text-sm font-bold text-[#245b46]">
                  {priorities.length}/2
                </span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {priorityOptions.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    aria-pressed={priorities.includes(item.value)}
                    onClick={() => togglePriority(item.value)}
                    className={`choice-card relative rounded-xl border px-2 py-2.5 text-left text-sm font-semibold ${priorities.includes(item.value) ? `${selectedCard} is-selected` : plainCard}`}
                  >
                    <span className={`choice-icon choice-icon-${item.icon} mr-2 align-middle`}>
                      <ChoiceIcon name={item.icon} />
                    </span>
                    {item.label}
                  </button>
                ))}
              </div>
            </section>
            <section className="border-t border-black/5 pt-6">
              <button
                type="button"
                aria-expanded={detailOpen}
                onClick={() => setDetailOpen((value) => !value)}
                className="flex w-full items-center justify-between text-left"
              >
                <span>
                  <strong>再加一些偏好（选填）</strong>
                  <small className="mt-1 block text-xs text-[#707a74]">
                    咖啡、购物、少排队等
                  </small>
                </span>
                <svg
                  aria-hidden="true"
                  viewBox="0 0 20 20"
                  className={`h-5 w-5 transition ${detailOpen ? "rotate-180" : ""}`}
                  fill="none"
                >
                  <path
                    d="m6 8 4 4 4-4"
                    stroke="currentColor"
                    strokeWidth="1.7"
                  />
                </svg>
              </button>
              {detailOpen && (
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {detailPreferenceOptions.map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      aria-pressed={detailPreferences.includes(item.value)}
                      onClick={() => toggleDetail(item.value)}
                      className={`min-h-11 rounded-xl border px-2 py-2 text-sm font-semibold ${detailPreferences.includes(item.value) ? selectedCard : plainCard}`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              )}
            </section>
          </div>
          <button type="button" onClick={()=>setStep(2)} className="btn-ghost mt-6 inline-flex min-h-11 items-center px-2">← 返回上一步</button>
        </div>}
      </section>

      {step===3&&<details
        id="trip-extras"
        className="card group rounded-[2rem] p-3 sm:p-4"
      >
        <summary className="focus-ring flex min-h-20 cursor-pointer list-none items-center justify-between gap-4 rounded-2xl border border-[#245b46]/12 bg-[#f4f7f2] px-4 py-3 shadow-sm transition hover:border-[#245b46]/25">
          <div>
            <h2 className="text-lg font-bold group-open:hidden">
              补充更多需求，让攻略更懂你
            </h2>
            <h2 className="hidden text-lg font-bold group-open:block">
              收起补充需求
            </h2>
            <p className="mt-1 text-sm text-[#707a74]">
              日期、人数、预算等均可选填
            </p>
          </div>
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            className="h-6 w-6 shrink-0 text-[#245b46] transition-transform duration-200 group-open:rotate-180"
          >
            <path
              d="m7 9 5 5 5-5"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </summary>
        <div className="mt-8 space-y-9 border-t border-black/5 pt-8">
          <section>
            <h3 className="font-bold">和谁一起？</h3>
            <p className="mt-1 text-sm text-[#707a74]">
              选填，帮助我们调整节奏与便利性
            </p>
            <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-6">
              {companionOptions.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  aria-pressed={companionType === item.value}
                  onClick={() => selectCompanion(item.value)}
                  className={`min-h-11 rounded-xl border px-1.5 py-2 text-sm font-semibold ${companionType === item.value ? selectedCard : plainCard}`}
                >
                  {item.label}
                </button>
              ))}
            </div>
            {companionType === "other" && (
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <NumberStepper
                  label="成人"
                  value={adults}
                  min={1}
                  max={8}
                  onChange={setAdults}
                />
                <NumberStepper
                  label="儿童"
                  value={children}
                  min={0}
                  max={7}
                  onChange={setChildren}
                />
                <NumberStepper
                  label="老人"
                  value={seniors}
                  min={0}
                  max={7}
                  onChange={setSeniors}
                />
              </div>
            )}
          </section>

          <section>
            <h3 className="font-bold">作息偏好</h3>
            <p className="mt-1 text-sm text-[#707a74]">
              选填，具体时间会优先用于每天安排
            </p>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <label className="text-sm font-semibold">
                大概几点起床
                <select
                  value={wakeTime}
                  onChange={(event) => setWakeTime(event.target.value)}
                  className={inputClass}
                >
                  <option value="">不限制</option>
                  {Array.from({ length: 21 }, (_, index) => {
                    const total = 360 + index * 30;
                    const time = `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
                    return (
                      <option key={time} value={time}>
                        {time}
                      </option>
                    );
                  })}
                </select>
              </label>
              <label className="text-sm font-semibold">
                希望几点出门
                <select
                  value={departureTime}
                  onChange={(event) => setDepartureTime(event.target.value)}
                  className={inputClass}
                >
                  <option value="">不限制</option>
                  {Array.from({ length: 21 }, (_, index) => {
                    const total = 360 + index * 30;
                    const time = `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
                    return (
                      <option key={time} value={time}>
                        {time}
                      </option>
                    );
                  })}
                </select>
              </label>
            </div>
          </section>
          <section>
            <h3 className="font-bold">出行时间</h3>
            <div className="mt-3 grid grid-cols-3 gap-1.5 sm:gap-2">
              {(
                [
                  ["undecided", "还没确定"],
                  ["approximate", "大概时间"],
                  ["exact", "已确定日期"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={dateType === value}
                  onClick={() => setDateType(value)}
                  className={`min-w-0 whitespace-nowrap rounded-xl border px-1.5 py-3 text-sm font-semibold sm:px-3 ${dateType === value ? selectedCard : plainCard}`}
                >
                  {label}
                </button>
              ))}
            </div>
            {dateType === "exact" && (
              <label className="mt-4 block text-sm font-semibold">
                具体日期
                <input
                  type="date"
                  min={minDate}
                  value={startDate}
                  onChange={(event) => setStartDate(event.target.value)}
                  className={inputClass}
                />
              </label>
            )}
            {dateType === "approximate" && (
              <label className="mt-4 block text-sm font-semibold">
                大概什么时候
                <input
                  value={approximateText}
                  onChange={(event) => setApproximateText(event.target.value)}
                  className={inputClass}
                  placeholder="例如：10月、秋天、国庆前后"
                />
              </label>
            )}
          </section>

          <section>
            <h3 className="font-bold">预算偏好</h3>
            <div className="mt-3 grid grid-cols-3 gap-1.5 sm:gap-2">
              {budgetModes.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  aria-pressed={budgetMode === item.value}
                  onClick={() => { setBudgetMode(item.value); if(item.value==="custom"){setBudgetScope("total");setIncludesAccommodation(true);} }}
                  className={`min-w-0 rounded-xl border px-1.5 py-3 text-center text-sm font-bold ${budgetMode === item.value ? selectedCard : plainCard}`}
                >
                  {item.label}
                </button>
              ))}
            </div>
            {budgetMode === "custom" && (
              <div className="mt-4 grid gap-4 rounded-2xl bg-[#f4f5f0] p-4 sm:grid-cols-2">
                <label className="text-sm font-semibold">
                  总预算金额（CNY）
                  <input
                    type="number"
                    min="1"
                    max="1000000"
                    step="1"
                    value={budgetAmount}
                    onChange={(event) => { setBudgetAmount(event.target.valueAsNumber); setBudgetError(""); }}
                    onBlur={() => { if(!Number.isFinite(budgetAmount)||budgetAmount<=0||budgetAmount>1_000_000) setBudgetError("请输入1～1,000,000元之间的金额"); }}
                    className={inputClass}
                  />
                  {budgetError && <span className="mt-2 block text-xs font-semibold text-red-700">{budgetError}</span>}
                </label>
                <label className="flex items-center gap-3 text-sm font-semibold">
                  <input
                    type="checkbox"
                    checked={includesIntercity}
                    onChange={(event) =>
                      setIncludesIntercity(event.target.checked)
                    }
                    className="h-5 w-5 accent-[#245b46]"
                  />
                  包含往返大交通
                </label>
              </div>
            )}
          </section>

          <section>
            <h3 className="font-bold">出发地与交通</h3>
            <label className="mt-3 block text-sm font-semibold">
              出发城市
              <input
                value={departureCity}
                onChange={(event) => setDepartureCity(event.target.value)}
                className={inputClass}
                placeholder="选填"
              />
              <span className="mt-2 block text-xs font-normal text-[#707a74]">用于估算去返程时间和大交通安排</span>
            </label>
            <div className="mt-4 flex flex-wrap gap-2">
              {transportOptions.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setTransport(item.value)}
                  className={`min-h-11 rounded-full border px-4 py-2 text-[15px] font-semibold sm:text-base ${transport === item.value ? selectedCard : plainCard}`}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <label className="mt-4 flex items-center gap-3 text-sm font-semibold">
              <input
                type="checkbox"
                checked={dayTrip}
                onChange={(event) => setDayTrip(event.target.checked)}
                className="h-5 w-5 accent-[#245b46]"
              />
              愿意安排一次目的地周边一日游
            </label>
          </section>

          <label className="block font-semibold">
            补充要求
            <textarea
              value={requirements}
              maxLength={300}
              onChange={(event) => setRequirements(event.target.value)}
              className={`${inputClass} min-h-24 resize-y`}
              placeholder="例如：不想太早起、需要午休、避免爬坡……"
            />
          </label>
        </div>
      </details>}

      {error && (
        <p
          role="alert"
          className="rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-700"
        >
          {error}
        </p>
      )}
      {step===3&&<div className="mobile-action-bar rounded-[1.6rem] border border-[var(--border-soft)] bg-[color:rgba(246,250,245,.96)] p-3 shadow-xl backdrop-blur sm:static sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none">
        <button
          type="submit"
          disabled={submitting}
          aria-live="polite"
          className="btn-primary focus-ring flex w-full gap-2 whitespace-nowrap px-4 py-4 text-base disabled:cursor-wait disabled:opacity-60 sm:px-8 sm:text-lg"
        >
          {submitting && (
            <span
              aria-hidden="true"
              className="h-4 w-4 animate-spin rounded-full border-2 border-white/35 border-t-white"
            />
          )}
          {submitting ? "正在准备你的旅行……" : "一键生成我的定制旅行"}
        </button>
        <p className="mt-2 text-center text-xs text-[var(--text-secondary)]">
          {generationAccessMode === "tester_unlimited"
            ? "测试权限：攻略生成与修改次数不限"
            : "每天可免费生成2次"}
        </p>
      </div>}
      <p className="text-center text-xs leading-5 text-[var(--text-secondary)]">
        AI规划不含实时天气、票价或营业数据，出发前请再次确认。
      </p>
      {toast && (
        <p
          role="status"
          className="text-right text-sm font-semibold text-[#245b46]"
        >
          {toast}
        </p>
      )}
      {provinceConfirm && (
        <div
          className="fixed inset-0 z-[70] grid place-items-center bg-black/35 p-5"
          role="dialog"
          aria-modal="true"
          aria-labelledby="province-title"
        >
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
            <h2 id="province-title" className="text-xl font-bold">
              你填写的是“{provinceConfirm.normalizedName}”
            </h2>
            <p className="mt-2 text-sm text-[#65706a]">想怎么玩这次旅行？</p>
            <div className="mt-5 space-y-2">
              <button
                type="button"
                onClick={() => {
                  setProvinceConfirm(null);
                  startGeneration({
                    city: provinceConfirm.capital!,
                    country: "中国",
                    type: "province",
                    scope: "province_capital",
                    provinceName: provinceConfirm.provinceName,
                  });
                }}
                className={`w-full rounded-2xl border p-4 text-left ${days <= 3 ? selectedCard : plainCard}`}
              >
                <strong>只玩省会{provinceConfirm.capital}</strong>
                <span className="mt-1 block text-sm text-[#65706a]">
                  以{provinceConfirm.capital}为主要目的地生成行程
                </span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setProvinceConfirm(null);
                  startGeneration({
                    city: provinceConfirm.normalizedName,
                    country: "中国",
                    type: "province",
                    scope: "multi_city_region",
                    provinceName: provinceConfirm.provinceName,
                  });
                }}
                className={`w-full rounded-2xl border p-4 text-left ${days >= 4 ? selectedCard : plainCard}`}
              >
                <strong>
                  规划{provinceConfirm.normalizedName.replace(/省|自治区/u, "")}
                  多地
                </strong>
                <span className="mt-1 block text-sm text-[#65706a]">
                  根据天数和节奏安排顺路落脚点
                </span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setProvinceConfirm(null);
                  setTimeout(() => destinationRef.current?.focus(), 0);
                }}
                className={`w-full rounded-2xl border p-4 text-left ${plainCard}`}
              >
                <strong>返回填写具体城市</strong>
                <span className="mt-1 block text-sm text-[#65706a]">
                  保留原文字，填写大理、丽江等城市
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
      {longCityConfirm && (
        <div
          className="fixed inset-0 z-[70] grid place-items-center bg-black/35 p-5"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <h2 className="text-xl font-bold">
              这次有{days}天，要不要加入一个周边城市？
            </h2>
            <p className="mt-2 text-sm text-[#65706a]">
              {longCityConfirm.city}也可以继续单城慢慢玩。
            </p>
            <div className="mt-5 grid gap-2">
              <button
                type="button"
                onClick={() => {
                  setLongCityConfirm(null);
                  startGeneration({
                    city: longCityConfirm.city,
                    country: "中国",
                    type: "city",
                    scope: "single_city",
                    provinceName: null,
                  });
                }}
                className={`rounded-2xl border p-4 text-left ${plainCard}`}
              >
                <strong>只玩当前城市</strong>
              </button>
              <button
                type="button"
                onClick={() => {
                  setLongCityConfirm(null);
                  startGeneration({
                    city: `${longCityConfirm.city}及${longCityConfirm.nearby}`,
                    country: "中国",
                    type: "region",
                    scope: "multi_city_region",
                    provinceName: null,
                  });
                }}
                className={`rounded-2xl border p-4 text-left ${selectedCard}`}
              >
                <strong>加入周边城市</strong>
                <span className="mt-1 block text-sm text-[#65706a]">
                  优先考虑{longCityConfirm.nearby}，控制转场次数
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
      {clearConfirm && (
        <div
          className="fixed inset-0 z-[60] grid place-items-center bg-black/30 p-5"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl">
            <h2 className="text-xl font-bold">确定清空当前选择吗？</h2>
            <p className="mt-2 text-sm text-[#65706a]">
              只清除首页草稿，不会删除已生成攻略。
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setClearConfirm(false)}
                className="rounded-full border px-5 py-2.5 font-semibold"
              >
                取消
              </button>
              <button
                type="button"
                onClick={clearForm}
                className="rounded-full bg-[#a34838] px-5 py-2.5 font-semibold text-white"
              >
                确认清空
              </button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
