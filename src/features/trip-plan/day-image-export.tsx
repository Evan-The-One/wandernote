"use client";

import { useState } from "react";
import QRCode from "qrcode";
import type { DayPlan } from "@/types/trip";
import { formatDisplayValue } from "./display-formatters";
import { trackEvent } from "@/features/analytics/client";

const WIDTH = 1080;
const FONT = '"PingFang SC", "Microsoft YaHei", Arial, sans-serif';

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const lines: string[] = []; let current = "";
  for (const character of text) { const next = current + character; if (current && ctx.measureText(next).width > maxWidth) { lines.push(current); current = character; } else current = next; }
  if (current) lines.push(current); return lines;
}
function drawLines(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number, maxLines = 4) {
  const lines = wrap(ctx, text, maxWidth).slice(0, maxLines); lines.forEach((line,index) => ctx.fillText(line, x, y + index * lineHeight)); return y + lines.length * lineHeight;
}

function loadImage(source: string) { return new Promise<HTMLImageElement>((resolve, reject) => { const image = new Image(); image.onload = () => resolve(image); image.onerror = reject; image.src = source; }); }

async function renderDayImage(day: DayPlan, destination: string, tripTitle: string, tripId?: string) {
  await document.fonts?.ready;
  const height = Math.max(1640, 710 + day.activities.length * 235 + Math.max(1, day.dayTips.length) * 62);
  const canvas = document.createElement("canvas"); canvas.width = WIDTH; canvas.height = height;
  const ctx = canvas.getContext("2d"); if (!ctx) throw new Error("当前浏览器无法生成图片");
  ctx.fillStyle = "#f7f8f3"; ctx.fillRect(0,0,WIDTH,height);
  ctx.fillStyle = "#204f3c"; ctx.fillRect(0,0,WIDTH,300);
  ctx.strokeStyle = "#e2a24d"; ctx.lineWidth = 8; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(76,82); ctx.lineTo(112,46); ctx.moveTo(84,46); ctx.lineTo(112,46); ctx.lineTo(112,74); ctx.stroke();
  ctx.fillStyle = "#fff"; ctx.font = `700 46px ${FONT}`; ctx.fillText("一键出发",140,82);
  const brandCenter=140+ctx.measureText("一键出发").width/2;ctx.fillStyle = "#e7b66f"; ctx.font = `500 18px ${FONT}`;ctx.textAlign="center";ctx.fillText("T R I P   R E A D Y",brandCenter,118);ctx.textAlign="left";
  ctx.fillStyle = "rgba(255,255,255,.7)"; ctx.font = `600 24px ${FONT}`; ctx.fillText(`${destination} · DAY ${day.dayNumber}${day.date ? ` · ${day.date}` : ""}`,72,190);
  ctx.fillStyle = "#fff"; ctx.font = `700 44px ${FONT}`; drawLines(ctx, day.title || tripTitle, 72,245,920,56,2);
  let y = 360;
  ctx.fillStyle = "#245b46"; ctx.font = `700 28px ${FONT}`; ctx.fillText(day.theme,72,y);
  ctx.fillStyle = "#65706a"; ctx.font = `500 22px ${FONT}`; ctx.fillText(`强度：${formatDisplayValue(day.intensity)}　步行约 ${day.estimatedWalkingKm} km`,72,y+48); y += 105;
  const routeNames=day.activities.filter(activity=>["attraction","shopping","entertainment"].includes(activity.type)).slice(0,6).map(activity=>activity.name);if(routeNames.length>1){ctx.fillStyle="#eaf2ed";ctx.fillRect(64,y,952,82);ctx.fillStyle="#245b46";ctx.font=`500 18px ${FONT}`;drawLines(ctx,routeNames.join(" → "),88,y+48,880,26,2);y+=112;}
  day.activities.forEach((activity,index) => {
    ctx.fillStyle = "#e4ede7"; ctx.beginPath(); ctx.arc(92,y+24,18,0,Math.PI*2); ctx.fill();
    if (index < day.activities.length - 1) { ctx.strokeStyle="#cbdcd2";ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(92,y+45);ctx.lineTo(92,y+205);ctx.stroke(); }
    ctx.fillStyle="#245b46";ctx.font=`700 22px ${FONT}`;ctx.fillText(activity.startTime,126,y+10);
    ctx.fillStyle="#17201c";ctx.font=`700 30px ${FONT}`; const textY=drawLines(ctx,activity.name,126,y+52,820,39,2);
    ctx.fillStyle="#65706a";ctx.font=`500 21px ${FONT}`;ctx.fillText(`${activity.area} · ${activity.durationMinutes}分钟`,126,textY+12);
    if(activity.transportToNext){ctx.fillStyle="#f0f3ef";ctx.fillRect(126,textY+40,820,62);ctx.fillStyle="#536159";ctx.font=`500 19px ${FONT}`;drawLines(ctx,`下一站：${formatDisplayValue(activity.transportToNext.method)}约${activity.transportToNext.durationMinutes}分钟 · ${activity.transportToNext.description}`,146,textY+78,780,26,2);}
    y += 235;
  });
  ctx.fillStyle="#fff2dc";ctx.fillRect(64,y,952,Math.max(110,day.dayTips.length*55+70));ctx.fillStyle="#915b20";ctx.font=`700 25px ${FONT}`;ctx.fillText("今日提醒",92,y+42);ctx.font=`500 20px ${FONT}`;let tipY=y+82;day.dayTips.forEach((tip)=>{tipY=drawLines(ctx,`· ${tip}`,92,tipY,860,30,3)+12;});
  const publicUrl = tripId ? `https://www.yjchufa.com/trip/${encodeURIComponent(tripId)}` : "https://www.yjchufa.com";
  const qrDataUrl = await QRCode.toDataURL(publicUrl, { errorCorrectionLevel: "M", margin: 1, width: 148, color: { dark: "#204f3c", light: "#ffffff" } });
  ctx.drawImage(await loadImage(qrDataUrl), 860, height - 190, 148, 148);
  ctx.fillStyle="#7b847e";ctx.font=`500 20px ${FONT}`;ctx.textAlign="left";ctx.fillText("www.yjchufa.com",72,height-92);ctx.font=`500 17px ${FONT}`;ctx.fillText("扫码查看这份旅行计划",72,height-58);
  return new Promise<Blob>((resolve,reject)=>canvas.toBlob((blob)=>blob?resolve(blob):reject(new Error("图片生成失败")),"image/png"));
}

export function DayImageExport({ day, destination, tripTitle, tripId }: { day: DayPlan; destination: string; tripTitle: string; tripId?: string }) {
  const [status,setStatus]=useState<"idle"|"loading"|"success"|"error">("idle");
  function download(blob: Blob, filename: string) { const url=URL.createObjectURL(blob);const link=document.createElement("a");link.href=url;link.download=filename;document.body.appendChild(link);link.click();link.remove();window.setTimeout(()=>URL.revokeObjectURL(url),1000); }
  async function save() {
    if(status==="loading") return; setStatus("loading");
    try { const blob=await renderDayImage(day,destination,tripTitle,tripId); const filename=`一键出发-${destination}-第${day.dayNumber}天.png`; const file=new File([blob],filename,{type:"image/png"});
      if(navigator.share && navigator.canShare?.({files:[file]})){try {await navigator.share({files:[file],title:`${destination}第${day.dayNumber}天行程`});} catch(error) {if(error instanceof DOMException&&error.name==="AbortError"){setStatus("idle");return;}download(blob,filename);}}
      else download(blob,filename);
      setStatus("success"); trackEvent("day_image_saved",{pageName:"trip",tripId:tripId||null,metadata:{day:day.dayNumber}}); window.setTimeout(()=>setStatus("idle"),3000);
    } catch(error) { if(error instanceof DOMException && error.name==="AbortError"){setStatus("idle");return;} setStatus("error"); }
  }
  return <div className="text-right"><button type="button" onClick={save} disabled={status==="loading"} className="rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-[#245b46] disabled:cursor-wait disabled:opacity-60">{status==="loading"?"正在生成图片……":"保存今日行程为图片"}</button>{status==="success"&&<p className="mt-2 text-xs font-semibold text-[#287057]">今日行程图片已准备好</p>}{status==="error"&&<p className="mt-2 text-xs font-semibold text-red-700">图片生成失败，请稍后重试</p>}</div>;
}
