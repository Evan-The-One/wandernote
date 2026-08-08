"use client";
import Link from "next/link";
import {usePathname,useSearchParams} from "next/navigation";
import {BrandMark} from "./brand-mark";
import {SiteFooter} from "./site-footer";
import {AppIcon,type AppIconName} from "./app-icons";

const tabs:{label:string;href:string;icon:AppIconName;match:(path:string,query:string)=>boolean}[]=[
 {label:"出发",href:"/",icon:"depart",match:path=>path==="/"||path==="/create"||path==="/generating"},
 {label:"行程",href:"/trips",icon:"trips",match:path=>path==="/trips"},
 {label:"我的",href:"/account",icon:"account",match:path=>path==="/account"},
];

export function AppShell({children,contactEmail}:{children:React.ReactNode;contactEmail?:string}){
 const pathname=usePathname();const search=useSearchParams();const admin=pathname.startsWith("/admin");const query=search.get("tab")||"";
 if(admin)return <>{children}</>;
 return <div className="app-shell">
   <header className="desktop-header"><div className="app-container flex h-[72px] items-center justify-between"><BrandMark href="/"/><nav className="desktop-nav" aria-label="主要导航">{tabs.map(tab=>{const active=tab.match(pathname,query);return <Link key={tab.label} href={tab.href} aria-current={active?"page":undefined} className={active?"is-active":""}><AppIcon name={tab.icon}/><span>{tab.label}</span></Link>})}</nav></div></header>
   <div className="app-content">{children}</div>
   <div className="desktop-footer"><SiteFooter contactEmail={contactEmail}/></div>
 </div>;
}
