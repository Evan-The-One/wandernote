"use client";
import { useEffect, useRef, useState } from "react";
export function HeaderActions() {
  const [open, setOpen] = useState(false);
  const [recent, setRecent] = useState<string | null | undefined>(undefined);
  const [hasDraft,setHasDraft]=useState(false);
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const outside = (event: MouseEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", outside);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("mousedown", outside);
      document.removeEventListener("keydown", key);
    };
  }, []);
  useEffect(() => {
    if (!open) return;
    fetch("/api/recent-trip")
      .then(async (response) =>
        response.ok ? (await response.json()).tripId : null,
      )
      .then((value) => setRecent(value || null))
      .catch(() => setRecent(null));
  }, [open]);
  const action = (name: string) => {
    if(location.pathname!=="/"){sessionStorage.setItem("yijianchufa:pending-home-action",name);location.href="/#plan";return;}
    window.dispatchEvent(new CustomEvent(name));
    setOpen(false);
  };
  return (
    <div ref={root} className="relative">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => {setHasDraft(Boolean(localStorage.getItem("yijianchufa:trip-input")||localStorage.getItem("wandernote:demo-input")));setOpen((value) => !value)}}
        className="focus-ring inline-flex items-center gap-1.5 rounded-full bg-[#245b46] px-4 py-2 text-sm font-semibold text-white"
      >
        帮我安排
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          className={`h-4 w-4 transition ${open ? "rotate-180" : ""}`}
          fill="none"
        >
          <path d="m6 8 4 4 4-4" stroke="currentColor" strokeWidth="1.7" />
        </svg>
      </button>
      {open && (
        <div className="absolute right-0 top-12 z-50 w-64 rounded-2xl border border-black/8 bg-white p-2 shadow-xl">
          <MenuButton
            label="帮我选目的地"
            onClick={() => action("trip-open-recommender")}
          />
          {hasDraft?<MenuButton label="恢复上次填写" onClick={() => action("trip-restore-draft")} />:<p className="px-3 py-2 text-sm text-[#9aa09c]">暂无可恢复内容</p>}
          {recent === undefined ? (
            <p className="px-3 py-2 text-sm text-[#7b847e]">
              正在查找最近攻略…
            </p>
          ) : recent ? (
            <a
              href={`/trip/${recent}`}
              className="block rounded-xl px-3 py-2.5 text-sm font-semibold hover:bg-[#f2f5f0]"
            >
              查看最近攻略
            </a>
          ) : (
            <p className="px-3 py-2 text-sm text-[#9aa09c]">还没有生成过攻略</p>
          )}
          <MenuButton
            label="查看示例攻略"
            onClick={() => {
              if(location.pathname!=="/"){location.href="/#sample-trip";return;}
              document
                .getElementById("sample-trip")
                ?.scrollIntoView({ behavior: "smooth" });
              setOpen(false);
            }}
          />
          <MenuButton
            label="清空当前选择"
            danger
            onClick={() => action("trip-request-clear")}
          />
        </div>
      )}
    </div>
  );
}
function MenuButton({
  label,
  onClick,
  danger = false,
}: {
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`block w-full rounded-xl px-3 py-2.5 text-left text-sm font-semibold hover:bg-[#f2f5f0] ${danger ? "text-[#a34838]" : ""}`}
    >
      {label}
    </button>
  );
}
