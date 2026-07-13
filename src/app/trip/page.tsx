"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function TripPage() {
  const router = useRouter(); const [missing, setMissing] = useState(false);
  useEffect(() => { queueMicrotask(async () => { try { const response = await fetch("/api/recent-trip"); const payload = await response.json() as { tripId?: string | null }; const id = payload.tripId || localStorage.getItem("wandernote:recent-trip-id"); if (id) router.replace(`/trip/${id}`); else setMissing(true); } catch { const id = localStorage.getItem("wandernote:recent-trip-id"); if (id) router.replace(`/trip/${id}`); else setMissing(true); } }); }, [router]);
  return <main className="page-shell flex min-h-[70vh] items-center justify-center"><div className="text-center">{missing ? <><h1 className="text-2xl font-bold">还没有保存的攻略</h1><Link href="/create" className="mt-6 inline-block rounded-full bg-[#245b46] px-6 py-3 font-bold text-white">开始规划</Link></> : <div className="h-9 w-9 animate-spin rounded-full border-4 border-[#245b46]/20 border-t-[#245b46]" />}</div></main>;
}
