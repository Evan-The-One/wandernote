import type { TravelPosterSpec, TripImageAspectRatio, TripImageTemplateSpec } from "@/schemas/trip-image";

const WIDTH = 1080;
const FONT = '"PingFang SC", "Microsoft YaHei", Arial, sans-serif';
const sizes: Record<TripImageAspectRatio, { width: number; height: number; capacity: number }> = {
  "3:4": { width: WIDTH, height: 1440, capacity: 8 }, "9:16": { width: WIDTH, height: 1920, capacity: 11 }, "1:1": { width: WIDTH, height: 1080, capacity: 5 },
};
type Page = { kind: "cover" | "details" | "summary"; dayLabel: string; days: Array<TripImageTemplateSpec["days"][number] & { activities: TripImageTemplateSpec["days"][number]["activities"] }> };

export function buildPremiumImagePagePlan(spec: TripImageTemplateSpec): Page[] {
  const capacity = sizes[spec.aspectRatio].capacity; const details: Page[] = []; let current: Page["days"] = []; let used = 0;
  for (const day of spec.days) {
    let offset = 0;
    while (offset < day.activities.length) {
      const room = capacity - used; const take = Math.min(day.activities.length - offset, room || capacity);
      if (!room && current.length) { details.push({ kind: "details", dayLabel: label(current), days: current }); current = []; used = 0; continue; }
      current.push({ ...day, activities: day.activities.slice(offset, offset + take) }); used += take; offset += take;
      if (used >= capacity) { details.push({ kind: "details", dayLabel: label(current), days: current }); current = []; used = 0; }
    }
  }
  if (current.length) details.push({ kind: "details", dayLabel: label(current), days: current });
  if (spec.daysCount <= 2 && details.length === 1) return details;
  const pages: Page[] = [{ kind: "cover", dayLabel: `DAY 1–${spec.daysCount}`, days: [] }, ...details];
  if (spec.daysCount >= 5) pages.push({ kind: "summary", dayLabel: "出发前准备", days: [] });
  return pages;
}
function label(days: Page["days"]) { const values = days.map((day) => day.dayNumber); return values[0] === values[values.length - 1] ? `DAY ${values[0]}` : `DAY ${values[0]}–${values[values.length - 1]}`; }
function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) { const lines: string[] = []; let line = ""; for (const char of text) { const next = line + char; if (line && ctx.measureText(next).width > maxWidth) { lines.push(line); line = char; } else line = next; } if (line) lines.push(line); return lines; }
function lines(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, width: number, lineHeight: number, max = 3) { const values = wrap(ctx, text, width).slice(0, max); values.forEach((value, index) => ctx.fillText(value, x, y + index * lineHeight)); return y + values.length * lineHeight; }
function rounded(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, radius: number, fill: string) { ctx.fillStyle = fill; ctx.beginPath(); ctx.roundRect(x, y, w, h, radius); ctx.fill(); }
function brand(ctx: CanvasRenderingContext2D, y: number, dark = true) { ctx.textAlign = "center"; ctx.fillStyle = dark ? "#204f3c" : "#ffffff"; ctx.font = `700 34px ${FONT}`; ctx.fillText("一键出发", WIDTH / 2, y); ctx.fillStyle = dark ? "#b27b32" : "#f1c777"; ctx.font = `500 14px ${FONT}`; ctx.fillText("T R I P   R E A D Y", WIDTH / 2, y + 30); ctx.textAlign = "left"; }
function method(value: string) { return ({ walk: "步行", public_transport: "公交/地铁", taxi: "打车", mixed: "组合交通" } as Record<string, string>)[value] || "前往下一站"; }

async function renderPage(spec: TripImageTemplateSpec, page: Page, index: number, total: number) {
  await document.fonts?.ready; const { height } = sizes[spec.aspectRatio]; const canvas = document.createElement("canvas"); canvas.width = WIDTH; canvas.height = height; const ctx = canvas.getContext("2d"); if (!ctx) throw new Error("当前浏览器无法生成图片");
  ctx.fillStyle = "#f6f1e7"; ctx.fillRect(0, 0, WIDTH, height);
  if (page.kind === "cover") {
    ctx.fillStyle = "#204f3c"; ctx.fillRect(0, 0, WIDTH, height);
    ctx.fillStyle = "#e7b66f"; ctx.beginPath(); ctx.arc(850, 210, 220, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = "#2e6952"; ctx.beginPath(); ctx.arc(210, height - 160, 310, 0, Math.PI * 2); ctx.fill(); brand(ctx, 100, false);
    ctx.textAlign = "center"; ctx.fillStyle = "rgba(255,255,255,.72)"; ctx.font = `600 26px ${FONT}`; ctx.fillText(`${spec.destination} · ${spec.daysCount}天`, WIDTH / 2, height * .36);
    ctx.fillStyle = "#ffffff"; ctx.font = `700 64px ${FONT}`; const titleLines = wrap(ctx, spec.title, 850).slice(0, 3); titleLines.forEach((value, i) => ctx.fillText(value, WIDTH / 2, height * .43 + i * 82));
    ctx.fillStyle = "rgba(255,255,255,.75)"; ctx.font = `500 25px ${FONT}`; wrap(ctx, spec.theme, 800).slice(0, 3).forEach((value, i) => ctx.fillText(value, WIDTH / 2, height * .68 + i * 40)); ctx.textAlign = "left";
  } else if (page.kind === "summary") {
    brand(ctx, 82); ctx.fillStyle = "#204f3c"; ctx.font = `700 52px ${FONT}`; ctx.fillText("准备好，就出发", 72, 220);
    [["建议住宿", spec.stayArea], ["主要交通", spec.transportAdvice], ["出发前确认", spec.reminder]].forEach(([title, body], i) => { const y = 320 + i * 250; rounded(ctx, 64, y, 952, 190, 28, i === 2 ? "#fff2d9" : "#ffffff"); ctx.fillStyle = i === 2 ? "#9a6223" : "#245b46"; ctx.font = `700 25px ${FONT}`; ctx.fillText(title, 96, y + 50); ctx.fillStyle = "#526159"; ctx.font = `500 24px ${FONT}`; lines(ctx, body, 96, y + 95, 860, 38, 3); });
  } else {
    brand(ctx, 76); ctx.fillStyle = "#204f3c"; ctx.font = `700 42px ${FONT}`; ctx.fillText(spec.title, 64, 160); ctx.fillStyle = "#a36f2f"; ctx.font = `700 22px ${FONT}`; ctx.fillText(page.dayLabel, 64, 202);
    let y = 255; const activityTotal = page.days.reduce((sum, day) => sum + day.activities.length, 0); const available = height - 350; const rowHeight = Math.max(78, Math.min(125, available / Math.max(activityTotal + page.days.length * .9, 1)));
    for (const day of page.days) {
      rounded(ctx, 64, y, 952, 76, 22, "#e5ede6"); ctx.fillStyle = "#204f3c"; ctx.font = `700 24px ${FONT}`; ctx.fillText(`DAY ${day.dayNumber}${day.date ? ` · ${day.date}` : ""}`, 92, y + 31); ctx.font = `600 20px ${FONT}`; ctx.fillText(day.theme || day.title, 92, y + 59); y += 102;
      for (const activity of day.activities) {
        ctx.fillStyle = "#d2dfd6"; ctx.beginPath(); ctx.arc(92, y + 22, 11, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = "#287057"; ctx.font = `700 18px ${FONT}`; ctx.fillText(activity.time, 124, y + 14); ctx.fillStyle = "#17201c"; ctx.font = `700 24px ${FONT}`; ctx.fillText(activity.name.slice(0, 24), 236, y + 14); ctx.fillStyle = "#6b756f"; ctx.font = `500 17px ${FONT}`; ctx.fillText(`${activity.area} · 约${activity.durationMinutes}分钟`, 236, y + 43); if (activity.transport) { ctx.fillStyle = "#7a847e"; ctx.font = `500 16px ${FONT}`; ctx.fillText(`${method(activity.transport.method)} ${activity.transport.durationMinutes}分钟 →`, 124, y + rowHeight - 12); } y += rowHeight;
      }
      y += 18;
    }
  }
  ctx.fillStyle = page.kind === "cover" ? "rgba(255,255,255,.65)" : "#7a847e"; ctx.font = `500 17px ${FONT}`; ctx.textAlign = "left"; ctx.fillText("yjchufa.com", 64, height - 42); ctx.textAlign = "right"; ctx.fillText(`${index + 1} / ${total}`, WIDTH - 64, height - 42); ctx.textAlign = "left";
  return new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("图片生成失败")), "image/png"));
}

export async function renderPremiumTripImages(spec: TripImageTemplateSpec) { const pages = buildPremiumImagePagePlan(spec); return Promise.all(pages.map((page, index) => renderPage(spec, page, index, pages.length))); }

function loadImage(src: string) { return new Promise<HTMLImageElement>((resolve, reject) => { const image = new Image(); image.onload = () => resolve(image); image.onerror = reject; image.src = src; }); }
function cropImage(ctx:CanvasRenderingContext2D,image:HTMLImageElement,x:number,y:number,w:number,h:number,radius:number){const scale=Math.max(w/image.width,h/image.height),sw=w/scale,sh=h/scale,sx=(image.width-sw)/2,sy=(image.height-sh)/2;ctx.save();ctx.beginPath();ctx.roundRect(x,y,w,h,radius);ctx.clip();ctx.drawImage(image,sx,sy,sw,sh,x,y,w,h);ctx.restore();}
const adviceIcons=["transport","stay","clothing","photo","food","time"] as const;
function drawAdviceIcon(ctx:CanvasRenderingContext2D,kind:(typeof adviceIcons)[number],x:number,y:number){
  ctx.save();ctx.strokeStyle="#245b46";ctx.fillStyle="transparent";ctx.lineWidth=2;ctx.lineCap="round";ctx.lineJoin="round";ctx.beginPath();
  if(kind==="transport"){ctx.roundRect(x,y+5,22,13,4);ctx.moveTo(x+4,y+5);ctx.lineTo(x+7,y);ctx.lineTo(x+16,y);ctx.lineTo(x+19,y+5);ctx.moveTo(x+5,y+20);ctx.arc(x+5,y+20,2,0,Math.PI*2);ctx.moveTo(x+17,y+20);ctx.arc(x+17,y+20,2,0,Math.PI*2);}
  else if(kind==="stay"){ctx.moveTo(x+1,y+10);ctx.lineTo(x+11,y+1);ctx.lineTo(x+21,y+10);ctx.moveTo(x+4,y+8);ctx.lineTo(x+4,y+22);ctx.lineTo(x+18,y+22);ctx.lineTo(x+18,y+8);ctx.moveTo(x+9,y+22);ctx.lineTo(x+9,y+14);ctx.lineTo(x+14,y+14);ctx.lineTo(x+14,y+22);}
  else if(kind==="clothing"){ctx.moveTo(x+8,y+2);ctx.lineTo(x+2,y+6);ctx.lineTo(x+5,y+12);ctx.lineTo(x+8,y+10);ctx.lineTo(x+8,y+22);ctx.lineTo(x+17,y+22);ctx.lineTo(x+17,y+10);ctx.lineTo(x+20,y+12);ctx.lineTo(x+23,y+6);ctx.lineTo(x+17,y+2);ctx.quadraticCurveTo(x+13,y+8,x+8,y+2);}
  else if(kind==="photo"){ctx.roundRect(x+1,y+6,22,16,3);ctx.moveTo(x+7,y+6);ctx.lineTo(x+9,y+2);ctx.lineTo(x+15,y+2);ctx.lineTo(x+17,y+6);ctx.moveTo(x+17,y+14);ctx.arc(x+12,y+14,5,0,Math.PI*2);}
  else if(kind==="food"){ctx.moveTo(x+5,y+1);ctx.lineTo(x+5,y+22);ctx.moveTo(x+1,y+1);ctx.lineTo(x+1,y+7);ctx.quadraticCurveTo(x+5,y+11,x+9,y+7);ctx.lineTo(x+9,y+1);ctx.moveTo(x+17,y+1);ctx.quadraticCurveTo(x+23,y+7,x+18,y+13);ctx.lineTo(x+18,y+22);}
  else{ctx.arc(x+12,y+12,10,0,Math.PI*2);ctx.moveTo(x+12,y+6);ctx.lineTo(x+12,y+12);ctx.lineTo(x+17,y+15);}
  ctx.stroke();ctx.restore();
}
export function posterAdviceLayout(){return {x:40,y:1282,width:944,height:190,columns:3,rows:2,cellWidth:314,rowHeight:58};}
function drawPosterAdvice(ctx:CanvasRenderingContext2D,values:string[]){const layout=posterAdviceLayout();rounded(ctx,layout.x,layout.y,layout.width,layout.height,18,"#f4f3eb");ctx.fillStyle="#245b46";ctx.font=`800 17px ${FONT}`;ctx.fillText("出发前看一眼",layout.x+18,layout.y+27);ctx.font=`600 13px ${FONT}`;const cells=values.slice(0,6).map(tip=>wrap(ctx,tip,layout.cellWidth-52).slice(0,2));const rowHeights=[0,1].map(row=>Math.max(42,...cells.slice(row*3,row*3+3).map(lines=>lines.length*17+12)));const rowStarts=[layout.y+48,layout.y+48+rowHeights[0]!];cells.forEach((textLines,i)=>{const col=i%3,row=Math.floor(i/3),x=layout.x+18+col*layout.cellWidth,y=rowStarts[row]!;drawAdviceIcon(ctx,adviceIcons[i]!,x,y+4);ctx.fillStyle="#34483e";ctx.font=`600 13px ${FONT}`;textLines.forEach((line,lineIndex)=>ctx.fillText(line,x+32,y+15+lineIndex*17));});const contentEnd=rowStarts[1]!+rowHeights[1]!;if(contentEnd>layout.y+layout.height-27)throw new Error("海报建议区域文字溢出");ctx.fillStyle="#7d877f";ctx.font=`500 11px ${FONT}`;ctx.fillText("景点图片为 AI 视觉示意，请以实际现场为准。",layout.x+18,layout.y+layout.height-12);}
async function addJpegComment(blob:Blob,comment:string){const source=new Uint8Array(await blob.arrayBuffer());if(source[0]!==0xff||source[1]!==0xd8)return blob;const encoded=new TextEncoder().encode(comment.slice(0,600)),segment=new Uint8Array(encoded.length+4);segment[0]=0xff;segment[1]=0xfe;const length=encoded.length+2;segment[2]=length>>8;segment[3]=length&255;segment.set(encoded,4);return new Blob([source.slice(0,2),segment,source.slice(2)],{type:"image/jpeg"});}
async function renderTimelinePosterV2(spec:Extract<TravelPosterSpec,{version:"shaoxing_timeline_v2"}>){
  return Promise.all(spec.pages.map(async(page,pageIndex)=>{const canvas=document.createElement("canvas");canvas.width=1024;canvas.height=1536;const ctx=canvas.getContext("2d");if(!ctx)throw new Error("当前浏览器无法生成海报");ctx.fillStyle="#fbf8ef";ctx.fillRect(0,0,1024,1536);
    ctx.fillStyle="#174c37";ctx.font=`800 43px ${FONT}`;const title=wrap(ctx,spec.title,790).slice(0,2);title.forEach((line,i)=>ctx.fillText(line,38,58+i*50));ctx.fillStyle="#6d776f";ctx.font=`600 18px ${FONT}`;ctx.fillText(`${spec.destination} · ${spec.daysCount}天 · ${page.dayRange}`,40,132);ctx.textAlign="right";ctx.fillStyle="#a87930";ctx.font=`700 16px ${FONT}`;ctx.fillText(`${pageIndex+1} / ${spec.pages.length}`,984,52);ctx.textAlign="left";
    const columns=page.days.length;const gap=18,left=24,cardWidth=columns===2?(1024-left*2-gap)/2:976;const top=154,bottom=1264,cardHeight=bottom-top;
    await Promise.all(page.days.map(async(day,column)=>{const x=left+column*(cardWidth+gap);ctx.strokeStyle="#cad4ca";ctx.lineWidth=1.5;ctx.beginPath();ctx.roundRect(x,top,cardWidth,cardHeight,18);ctx.stroke();rounded(ctx,x+8,top+8,cardWidth-16,66,14,"#245b46");ctx.fillStyle="#fff";ctx.font=`800 25px ${FONT}`;ctx.fillText(`Day ${day.dayNumber}${day.date?`  ${day.date}`:""}`,x+28,top+39);ctx.fillStyle="#dce9df";ctx.font=`600 14px ${FONT}`;ctx.fillText(day.title.slice(0,24),x+28,top+60);
      const count=day.activities.length,rowHeight=Math.min(174,Math.floor((cardHeight-92)/Math.max(count,1))),timelineX=x+31,textX=x+56,imageW=columns===2?142:245,imageH=Math.min(104,rowHeight-34),imageX=x+cardWidth-imageW-16,textW=imageX-textX-12;
      for(let i=0;i<count;i++){const activity=day.activities[i]!,rowY=top+88+i*rowHeight;if(i<count-1){ctx.strokeStyle="#cbd6cc";ctx.lineWidth=2;ctx.setLineDash([3,7]);ctx.beginPath();ctx.moveTo(timelineX,rowY+38);ctx.lineTo(timelineX,rowY+rowHeight+8);ctx.stroke();ctx.setLineDash([]);}ctx.fillStyle="#245b46";ctx.beginPath();ctx.arc(timelineX,rowY+25,6,0,Math.PI*2);ctx.fill();ctx.fillStyle="#245b46";ctx.font=`800 ${columns===2?16:18}px ${FONT}`;ctx.fillText(activity.time,textX,rowY+18);ctx.fillStyle="#182b22";ctx.font=`800 ${columns===2?18:21}px ${FONT}`;const nameLines=wrap(ctx,activity.name,textW).slice(0,2);nameLines.forEach((line,n)=>ctx.fillText(line,textX,rowY+45+n*23));ctx.fillStyle="#5d6962";ctx.font=`500 ${columns===2?13:15}px ${FONT}`;const noteY=rowY+50+nameLines.length*22;wrap(ctx,activity.note,textW).slice(0,2).forEach((line,n)=>ctx.fillText(line,textX,noteY+n*19));const image=await loadImage(activity.visualAsset.dataUrl);cropImage(ctx,image,imageX,rowY+9,imageW,imageH,12);}
    }));
    const advice=spec.preTripAdvice&&pageIndex===spec.pages.length-1?[spec.preTripAdvice.transport,spec.preTripAdvice.accommodation,spec.preTripAdvice.clothing,spec.preTripAdvice.photoSpots,spec.preTripAdvice.food,spec.preTripAdvice.timing]:page.tips.slice(0,6);drawPosterAdvice(ctx,advice);
    ctx.textAlign="center";ctx.fillStyle="#245b46";ctx.font=`800 20px ${FONT}`;ctx.fillText("一键出发",512,1490);ctx.fillStyle="#a87930";ctx.font=`600 10px ${FONT}`;ctx.fillText("T R I P   R E A D Y",512,1509);ctx.fillStyle="#718078";ctx.font=`500 11px ${FONT}`;ctx.fillText("yjchufa.com · 不用查攻略，直接出发",512,1526);ctx.textAlign="left";
    const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(value=>value?resolve(value):reject(new Error("海报生成失败")),"image/jpeg",.93));return addJpegComment(blob,JSON.stringify({notice:"AI-generated visual illustration",model:spec.model,template:spec.version,generatedAt:new Date().toISOString()}));}));
}
export async function renderTravelPosters(spec: TravelPosterSpec) {
  await document.fonts?.ready;
  if(spec.version==="shaoxing_timeline_v2")return renderTimelinePosterV2(spec);
  return Promise.all(spec.pages.map(async (page, pageIndex) => {
    const canvas = document.createElement("canvas"); canvas.width = 1080; canvas.height = 1620; const ctx = canvas.getContext("2d"); if (!ctx) throw new Error("当前浏览器无法生成海报");
    const image = await loadImage(page.backgroundDataUrl); ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height); gradient.addColorStop(0, "rgba(247,245,238,.72)"); gradient.addColorStop(.34, "rgba(247,245,238,.12)"); gradient.addColorStop(.58, "rgba(247,245,238,.28)"); gradient.addColorStop(1, "rgba(247,245,238,.94)"); ctx.fillStyle = gradient; ctx.fillRect(0, 0, canvas.width, canvas.height);
    rounded(ctx, 48, 42, 984, 185, 30, "rgba(250,248,241,.91)"); ctx.textAlign = "center"; ctx.fillStyle = "#204f3c"; ctx.font = `800 53px ${FONT}`; wrap(ctx, spec.title, 880).slice(0, 2).forEach((value, index) => ctx.fillText(value, 540, 108 + index * 59)); ctx.fillStyle = "#9a682d"; ctx.font = `600 19px ${FONT}`; ctx.fillText(`${spec.destination} · ${spec.daysCount}天 · ${page.dayRange}`, 540, 202); ctx.textAlign = "left";
    if (page.kind === "cover") {
      rounded(ctx, 72, 970, 936, 410, 34, "rgba(250,248,241,.92)"); ctx.fillStyle = "#204f3c"; ctx.font = `800 34px ${FONT}`; ctx.fillText("这次这样玩", 110, 1030); ctx.fillStyle = "#37483f"; ctx.font = `600 27px ${FONT}`; lines(ctx, spec.subtitle, 110, 1080, 850, 43, 4); ctx.fillStyle = "#9a682d"; ctx.font = `700 21px ${FONT}`; ctx.fillText("建议住宿", 110, 1250); ctx.fillStyle = "#37483f"; ctx.font = `600 25px ${FONT}`; lines(ctx, spec.stayArea, 110, 1290, 850, 36, 2);
    } else {
      let y = 780; for (const day of page.days) { const cardHeight = page.days.length === 1 ? 650 : 355; rounded(ctx, 58, y, 964, cardHeight, 34, "rgba(250,248,241,.94)"); ctx.fillStyle = "#204f3c"; ctx.font = `800 28px ${FONT}`; ctx.fillText(`DAY ${day.dayNumber}  ${day.title}`, 96, y + 52); ctx.fillStyle = "#a36f2f"; ctx.font = `600 18px ${FONT}`; ctx.fillText(day.city, 96, y + 82); let rowY = y + 126; for (const activity of day.activities.slice(0, page.days.length === 1 ? 5 : 4)) { ctx.fillStyle = "#e2b95e"; ctx.beginPath(); ctx.arc(104, rowY - 7, 7, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = "#245b46"; ctx.font = `800 19px ${FONT}`; ctx.fillText(activity.time, 128, rowY); ctx.fillStyle = "#1f2d26"; ctx.font = `700 22px ${FONT}`; ctx.fillText(activity.name.slice(0, 24), 222, rowY); ctx.fillStyle = "#637068"; ctx.font = `500 17px ${FONT}`; ctx.fillText(activity.note.slice(0, 36), 222, rowY + 27); rowY += page.days.length === 1 ? 91 : 63; } y += cardHeight + 22; }
    }
    rounded(ctx, 48, 1490, 984, 88, 25, "rgba(32,79,60,.94)"); ctx.textAlign = "center"; ctx.fillStyle = "#fff"; ctx.font = `800 24px ${FONT}`; ctx.fillText("一键出发", 540, 1525); ctx.fillStyle = "#f1c777"; ctx.font = `600 12px ${FONT}`; ctx.fillText("T R I P   R E A D Y", 540, 1547); ctx.fillStyle = "rgba(255,255,255,.78)"; ctx.font = `500 13px ${FONT}`; ctx.fillText(`yjchufa.com   ·   ${pageIndex + 1} / ${spec.pages.length}`, 540, 1567); ctx.textAlign = "left";
    return new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("海报生成失败")), "image/jpeg", .92));
  }));
}
