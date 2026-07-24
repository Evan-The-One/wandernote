"use client";

import { createPortal } from "react-dom";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";

type MenuPosition = { top: number; right: number };

export function HeaderActions() {
  const [open, setOpen] = useState(false);
  const [recent, setRecent] = useState<string | null | undefined>(undefined);
  const [hasDraft, setHasDraft] = useState(false);
  const [position, setPosition] = useState<MenuPosition>({ top: 64, right: 16 });
  const [authenticated,setAuthenticated]=useState<boolean|null>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);

  const updatePosition = () => {
    const rect = trigger.current?.getBoundingClientRect();
    if (!rect) return;
    setPosition({ top: Math.min(rect.bottom + 8, window.innerHeight - 280), right: Math.max(16, window.innerWidth - rect.right) });
  };

  useEffect(() => {
    fetch("/api/auth/session",{cache:"no-store"}).then(response=>response.ok?response.json():null).then(value=>setAuthenticated(Boolean(value?.authenticated))).catch(()=>setAuthenticated(false));
  },[]);

  useEffect(() => {
    if (!open) return;
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setOpen(false); trigger.current?.focus(); }
    };
    updatePosition();
    document.addEventListener("keydown", key);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      document.removeEventListener("keydown", key);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    fetch("/api/recent-trip")
      .then(async (response) => response.ok ? (await response.json()).tripId : null)
      .then((value) => setRecent(value || null))
      .catch(() => setRecent(null));
  }, [open]);

  const action = (name: string) => {
    setOpen(false);
    if (name === "trip-restore-draft") { window.location.reload(); return; }
    if (location.pathname !== "/") {
      sessionStorage.setItem("yijianchufa:pending-home-action", name);
      location.href = "/#plan";
      return;
    }
    window.dispatchEvent(new Event(name));
  };

  const panel = open ? (<>
    <button type="button" tabIndex={-1} aria-label="关闭快捷操作" onClick={() => setOpen(false)} className="fixed inset-0 z-[90] cursor-default bg-transparent" />
    <div ref={menu} role="menu" aria-label="快捷操作" style={{ top: position.top, right: position.right }} className="fixed z-[100] w-[min(18rem,calc(100vw-2rem))] rounded-2xl border border-black/8 bg-white p-2 shadow-xl">
      {authenticated!==null&&<a role="menuitem" href={authenticated?"/account":"/login"} onClick={()=>setOpen(false)} className="flex min-h-11 items-center rounded-xl px-3 text-sm font-semibold hover:bg-[#f2f5f0] sm:hidden">{authenticated?"我的攻略":"邮箱登录"}</a>}
      <MenuButton label="返回再次选择" onClick={() => action("return-to-plan")} />
      {hasDraft ? <MenuButton label="恢复上次填写" onClick={() => action("trip-restore-draft")} /> : <p className="flex min-h-11 items-center px-3 text-sm text-[#9aa09c]">暂无可恢复内容</p>}
      {recent === undefined ? <p className="flex min-h-11 items-center px-3 text-sm text-[#7b847e]">正在查找最近攻略…</p> : recent ? (
        <a role="menuitem" href={`/trip/${recent}`} onClick={() => setOpen(false)} className="flex min-h-11 items-center rounded-xl px-3 text-sm font-semibold hover:bg-[#f2f5f0]">查看最近攻略</a>
      ) : <p className="flex min-h-11 items-center px-3 text-sm text-[#9aa09c]">还没有生成过攻略</p>}
      <MenuButton label="查看示例攻略" onClick={() => {
        setOpen(false);
        if (location.pathname !== "/") { location.href = "/#sample-trip"; return; }
        document.getElementById("sample-trip")?.scrollIntoView({ behavior: "smooth" });
      }} />
      <MenuButton label="清空当前选择" onClick={() => action("clear-trip-input")} danger />
    </div>
  </>
  ) : null;

  return (
    <div className="flex items-center gap-2">
      {authenticated!==null&&<Link href={authenticated?"/account":"/login"} className="hidden min-h-11 items-center rounded-full border border-[#245b46]/18 bg-white px-3 text-sm font-semibold text-[#245b46] sm:inline-flex">{authenticated?"我的攻略":"邮箱登录"}</Link>}
      <div className="relative">
      <button ref={trigger} type="button" aria-haspopup="menu" aria-expanded={open} onClick={() => {
        setHasDraft(Boolean(localStorage.getItem("yijianchufa:trip-input") || localStorage.getItem("wandernote:demo-input")));
        setOpen((value) => !value);
      }} className="focus-ring inline-flex min-h-11 items-center gap-1.5 rounded-full bg-[#245b46] px-4 py-2 text-sm font-semibold text-white">
        快捷操作
        <svg aria-hidden="true" viewBox="0 0 20 20" className={`h-4 w-4 transition ${open ? "rotate-180" : ""}`} fill="none"><path d="m6 8 4 4 4-4" stroke="currentColor" strokeWidth="1.7" /></svg>
      </button>
      {typeof document !== "undefined" && panel ? createPortal(panel, document.body) : null}
      </div>
    </div>
  );
}

function MenuButton({ label, onClick, danger = false }: { label: string; onClick: () => void; danger?: boolean }) {
  return <button role="menuitem" type="button" onClick={onClick} className={`flex min-h-11 w-full items-center rounded-xl px-3 text-left text-sm font-semibold hover:bg-[#f2f5f0] ${danger ? "text-[#a34838]" : ""}`}>{label}</button>;
}
