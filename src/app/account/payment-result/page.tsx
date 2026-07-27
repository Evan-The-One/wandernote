"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

function PaymentResultContent(){
  const order=useSearchParams().get("order"),[status,setStatus]=useState("pending");
  useEffect(()=>{if(!order)return;let stopped=false;const poll=async()=>{const r=await fetch(`/api/payments/orders/${encodeURIComponent(order)}`,{cache:"no-store"});if(r.ok){const p=await r.json();if(!stopped)setStatus(p.status);}};void poll();const id=setInterval(()=>void poll(),2500);return()=>{stopped=true;clearInterval(id);};},[order]);
  const fulfilled=status==="fulfilled";
  return <main className="page-shell max-w-xl py-16"><section className="card rounded-3xl p-8 text-center"><h1 className="text-2xl font-bold">{fulfilled?"点数已到账":"正在确认付款"}</h1><p className="mt-3 text-[#65706a]">{fulfilled?"可以返回账户查看余额，再确认生成旅行海报。":status==="refunded"?"订单已经退款。":status==="disputed"||status==="manual_review"?"订单正在人工复核，请联系客服。":"付款确认可能需要一点时间，关闭页面也不会影响Webhook到账。"}</p><div className="mt-6 flex justify-center gap-3"><Link href="/account" className="rounded-full bg-[#245b46] px-5 py-3 font-bold text-white">返回我的点数</Link><Link href="/" className="rounded-full border px-5 py-3 font-bold">返回首页</Link></div></section></main>;
}
export default function PaymentResultPage(){return <Suspense fallback={<main className="page-shell py-16 text-center">正在读取订单…</main>}><PaymentResultContent/></Suspense>;}
