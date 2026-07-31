"use client";
import {useEffect} from "react";
export function AuthVerifiedSignal({returnTo,pendingAction}:{returnTo:string;pendingAction:string|null}){useEffect(()=>{const detail={type:"login_completed",returnTo,pendingAction,completedAt:Date.now()};try{new BroadcastChannel("yjchufa-auth").postMessage(detail);}catch{/* unsupported */}try{localStorage.setItem("yjchufa:auth-completed",JSON.stringify(detail));localStorage.setItem("yjchufa:auth-state",JSON.stringify(detail));}catch{/* storage unavailable */}},[returnTo,pendingAction]);return null;}
