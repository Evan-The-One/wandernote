"use client";
import Link from "next/link";
import {usePathname,useSearchParams} from "next/navigation";
import {BrandMark} from "./brand-mark";
import {HeaderActions} from "./header-actions";
import {SiteFooter} from "./site-footer";
import {AppIcon,type AppIconName} from "./app-icons";

const tabs:{label:string;href:string;icon:AppIconName;match:(path:string,query:string)=>boolean}[]=[
 {label:"出发",href:"/",icon:"depart",match:path=>path==="/"||path==="/create"||path==="/generating"},
 {label:"行程",href:"/account?tab=trips",icon:"trips",match:(path,query)=>path==="/account"&&query!=="settings"},
 {label:"我的",href:"/account?tab=settings",icon:"account",match:(path,query)=>path==="/login"||(path==="/account"&&query==="settings")},
];

export function AppShell({children,contactEmail}:{children:React.ReactNode;contactEmail?:string}){
 const pathname=usePathname();const search=useSearchParams();const admin=pathname.startsWith("/admin");const readonly=pathname.startsWith("/trip/")&&search.get("share")==="1";const query=search.get("tab")||"";
 if(admin)return <>{children}</>;
 return <div className="app-shell">
   <header className="desktop-header"><div className="app-container flex h-[72px] items-center justify-between"><BrandMark href="/"/><nav className="desktop-nav" aria-label="主要导航">{tabs.map(tab=><Link key={tab.label} href={tab.href} className={tab.match(pathname,query)?"is-active":""}><AppIcon name={tab.icon}/><span>{tab.label}</span></Link>)}</nav><HeaderActions/></div></header>
   <div className="app-content">{children}</div>
   <div className="desktop-footer"><SiteFooter contactEmail={contactEmail}/></div>
   {!readonly&&<nav className="mobile-tab-bar" aria-label="主要导航">{tabs.map(tab=>{const active=tab.match(pathname,query);return <Link key={tab.label} href={tab.href} aria-current={active?"page":undefined} className={active?"is-active":""}><span className="tab-icon"><AppIcon name={tab.icon}/></span><span>{tab.label}</span></Link>})}</nav>}
 </div>;
}
