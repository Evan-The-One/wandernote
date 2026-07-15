"use client";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { trackEvent } from "./client";
export function PageTracker(){const pathname=usePathname();useEffect(()=>{const pageName=pathname==="/"?"home":pathname==="/generating"?"generating":pathname.startsWith("/trip/")?"trip":"other";const width=window.innerWidth;const device=width<768?"mobile":width<1100?"tablet":"desktop";const started=Date.now();trackEvent("page_view",{pageName,metadata:{device}});let sent=false;const send=()=>{if(sent)return;sent=true;trackEvent("page_duration",{pageName,durationMs:Math.min(Date.now()-started,30*60*1000),metadata:{device}});};const visibility=()=>{if(document.visibilityState==="hidden")send();};document.addEventListener("visibilitychange",visibility);window.addEventListener("pagehide",send);return()=>{send();document.removeEventListener("visibilitychange",visibility);window.removeEventListener("pagehide",send);};},[pathname]);return null;}
