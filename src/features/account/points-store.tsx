"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { trackEvent } from "@/features/analytics/client";

type Pack={id:string;points:number;amountCents:number;currency:string};
type Config={enabled:boolean;provider:string;mode:string;packages:Pack[]};

export function PointsStore(){
  const[config,setConfig]=useState<Config|null>(null),[loading,setLoading]=useState(""),[message,setMessage]=useState("");
  useEffect(()=>{fetch("/api/payments/config").then(r=>r.json()).then((value)=>{setConfig(value);trackEvent("points_store_viewed",{pageName:"account"});});},[]);
  async function checkout(pack:Pack){
    if(!config?.enabled){setMessage("点数购买即将开放");return;}
    setLoading(pack.id);setMessage("");trackEvent("point_pack_selected",{pageName:"account",metadata:{packId:pack.id}});
    const response=await fetch("/api/payments/checkout",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({packId:pack.id,idempotencyKey:crypto.randomUUID()})});
    const payload=await response.json();
    if(response.ok&&payload.checkoutUrl){trackEvent("checkout_created",{pageName:"account",metadata:{packId:pack.id}});window.location.assign(payload.checkoutUrl);return;}
    setLoading("");setMessage(payload.error?.message||"暂时无法创建付款页面");
  }
  return <section className="mt-6 rounded-3xl border border-[#dbe4d8] bg-[#f8faf6] p-5"><h3 className="text-lg font-bold">购买海报点数</h3><p className="mt-2 text-sm text-[#65706a]">1点对应1张标准海报页；文字攻略的查看和分享始终免费。</p><div className="mt-4 grid gap-3 sm:grid-cols-3">{config?.packages.map(pack=><button key={pack.id} disabled={Boolean(loading)} onClick={()=>void checkout(pack)} className="min-h-24 rounded-2xl border bg-white p-4 text-left disabled:opacity-60"><strong className="block text-xl">{pack.points}点</strong><span className="mt-1 block text-sm">{(pack.amountCents/100).toFixed(2)} {pack.currency}</span></button>)}</div>{!config?.enabled&&<p className="mt-3 text-sm text-[#8a6741]">点数购买即将开放</p>}{message&&<p className="mt-3 text-sm text-[#8a4b3b]">{message}</p>}<p className="mt-4 text-xs leading-6 text-[#707a74]">1～2天1点，3～4天2点，5～6天3点，7天4点。购买前请阅读 <Link href="/points-rules" className="underline">点数规则</Link>、<Link href="/refund-policy" className="underline">退款政策</Link>和<Link href="/terms" className="underline">服务协议</Link>。</p></section>;
}
