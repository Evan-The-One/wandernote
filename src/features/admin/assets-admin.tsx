"use client";
import { useEffect, useState } from "react";
type Asset={id:string;destination:string;name:string;category:string;isGeneric:boolean;status:string;reuseCount:number;cost:string;updatedAt:string};
export function AssetsAdmin(){
  const[rows,setRows]=useState<Asset[]>([]),[error,setError]=useState("");
  const load=()=>fetch("/api/admin/assets").then(r=>r.ok?r.json():Promise.reject()).then(p=>setRows(p.rows)).catch(()=>setError("素材读取失败"));
  useEffect(()=>{void load();},[]);
  async function review(id:string,action:"approve"|"reject"|"disable"){const response=await fetch("/api/admin/assets",{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({id,action})});if(response.ok)void load();else setError("操作失败");}
  return <main className="page-shell py-10"><h1 className="text-3xl font-bold">海报视觉素材</h1><p className="mt-2 text-sm text-[#707a74]">地点图与通用真实场景图统一在这里审核、停用并统计复用。</p>{error&&<p className="mt-4 text-red-700">{error}</p>}<div className="mt-6 overflow-x-auto rounded-2xl border bg-white"><table className="w-full min-w-[760px] text-left text-sm"><thead><tr className="border-b bg-[#f4f6f1]"><th className="p-3">范围</th><th>素材</th><th>类型</th><th>状态</th><th>复用</th><th>成本</th><th>操作</th></tr></thead><tbody>{rows.map(row=><tr key={row.id} className="border-b"><td className="p-3">{row.isGeneric?"通用真实场景":row.destination}</td><td>{row.name}</td><td>{row.category}</td><td>{row.status}</td><td>{row.reuseCount}</td><td>${Number(row.cost).toFixed(4)}</td><td className="space-x-2"><button onClick={()=>review(row.id,"approve")} className="underline">通过</button><button onClick={()=>review(row.id,"reject")} className="underline">拒绝</button><button onClick={()=>review(row.id,"disable")} className="underline">停用</button></td></tr>)}</tbody></table></div></main>;
}
