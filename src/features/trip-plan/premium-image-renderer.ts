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
export async function renderTravelPosters(spec: TravelPosterSpec) {
  await document.fonts?.ready;
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
