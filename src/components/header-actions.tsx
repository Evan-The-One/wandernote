"use client";
import { useEffect, useRef, useState } from "react";
export function HeaderActions() {
  const [open, setOpen] = useState(false);
  const [recent, setRecent] = useState<string | null | undefined>(undefined);
  const [hasDraft,setHasDraft]=useState(false);
  const [requestId,setRequestId]=useState(0);
  const root = useRef<HTMLDivElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const outside = (event: PointerEvent) => {
      const rects = [root.current, menu.current].filter(Boolean).map((element) => element!.getBoundingClientRect());
      const inside = rects.some((rect) => event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom);
      if (!inside) {
        window.setTimeout(() => setOpen(false), 100);
      }
    };
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("pointerdown", outside);
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
    setOpen(false);
    if (name === "trip-restore-draft") {
      window.location.reload();
      return;
    }
    const event = document.createEvent("Event");
    event.initEvent(name, false, false);
    window.dispatchEvent(event);
  };
  return (
    <div ref={root} className="relative">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => {setHasDraft(Boolean(localStorage.getItem("yijianchufa:trip-input")||localStorage.getItem("wandernote:demo-input")));setRequestId((value)=>value+1);setOpen((value) => !value)}}
        className="focus-ring inline-flex items-center gap-1.5 rounded-full bg-[#245b46] px-4 py-2 text-sm font-semibold text-white"
      >
        快捷操作
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
        <div ref={menu} className="absolute right-0 top-12 z-50 w-64 rounded-2xl border border-black/8 bg-white p-2 shadow-xl">
          <MenuLink label="帮我选目的地" href={`/?homeAction=choose-destination&request=${requestId}#plan`} />
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
              setOpen(false);
              if(location.pathname!=="/"){location.href="/#sample-trip";return;}
              document
                .getElementById("sample-trip")
                ?.scrollIntoView({ behavior: "smooth" });
            }}
          />
          <MenuLink label="清空当前选择" href={`/?homeAction=clear-trip-input&request=${requestId}#plan`} danger />
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

function MenuLink({ label, href, danger = false }: { label: string; href: string; danger?: boolean }) {
  return <a href={href} className={`block w-full rounded-xl px-3 py-2.5 text-left text-sm font-semibold hover:bg-[#f2f5f0] ${danger ? "text-[#a34838]" : ""}`}>{label}</a>;
}
