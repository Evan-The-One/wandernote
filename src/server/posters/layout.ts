import { createHash } from "node:crypto";

export const POSTER_LAYOUT_TOKENS = { contentTop:172, finalContentBottom:1266, dayHeaderHeight:92, standardRowMin:156, compactRowMin:142, denseRowMin:142, titleChars:13, noteChars:16 } as const;
export type PosterLayoutMode = "standard" | "compact" | "dense" | "continuation";
export type LayoutActivity = { id:string; time:string; name:string; note:string };
export type LayoutDay = { dayNumber:number; date:string|null; title:string; city:string; tips:string[]; activities:LayoutActivity[] };
export type PlannedDay = Omit<LayoutDay,"activities"> & { continuation:boolean; activities:LayoutActivity[] };
export type PosterLayoutPage = { pageNumber:number; layoutMode:PosterLayoutMode; days:PlannedDay[] };
export type PosterLayoutPlan = { pageCount:number; pages:PosterLayoutPage[]; expectedActivityIds:string[]; renderedActivityIds:string[]; totalActivityCount:number; estimatedHeights:number[]; layoutPlanHash:string };

const lines = (value:string, chars:number, max=2) => Math.max(1,Math.min(max,Math.ceil([...value.trim()].length/chars)));
export function measureActivityBlock(activity:LayoutActivity, mode:PosterLayoutMode) {
  const minimum=mode==="standard"?POSTER_LAYOUT_TOKENS.standardRowMin:mode==="compact"?POSTER_LAYOUT_TOKENS.compactRowMin:POSTER_LAYOUT_TOKENS.denseRowMin;
  return Math.max(minimum,54+lines(activity.name,POSTER_LAYOUT_TOKENS.titleChars)*25+lines(activity.note,POSTER_LAYOUT_TOKENS.noteChars)*20+16);
}
const capacity=()=>POSTER_LAYOUT_TOKENS.finalContentBottom-POSTER_LAYOUT_TOKENS.contentTop-POSTER_LAYOUT_TOKENS.dayHeaderHeight;
const height=(items:LayoutActivity[],mode:PosterLayoutMode)=>items.reduce((sum,item)=>sum+measureActivityBlock(item,mode),0);
export function findBestActivitySplit(items:LayoutActivity[],mode:PosterLayoutMode,maxHeight:number){let best:number|null=null,score=Infinity;for(let index=1;index<items.length;index++){const left=height(items.slice(0,index),mode),right=height(items.slice(index),mode);if(left<=maxHeight&&right<=maxHeight&&Math.abs(left-right)<score){best=index;score=Math.abs(left-right);}}return best;}
function densePages(day:LayoutDay){
  const result:Array<{mode:PosterLayoutMode;days:PlannedDay[]}>=[],queue=[...day.activities];let continued=false;
  while(queue.length){let take=Math.min(queue.length,12),split:number|null=null;while(take>1&&!(split=findBestActivitySplit(queue.slice(0,take),continued?"continuation":"dense",capacity())))take--;
    if(!split){const one=queue.shift()!;result.push({mode:continued?"continuation":"dense",days:[{...day,title:continued?`${day.title} · 继续`:day.title,continuation:continued,activities:[one]}]});continued=true;continue;}
    const chunk=queue.splice(0,take);result.push({mode:continued?"continuation":"dense",days:[{...day,title:continued?`${day.title} · 继续`:day.title,continuation:continued,activities:chunk.slice(0,split)},{...day,title:`Day ${day.dayNumber} · 继续`,continuation:true,activities:chunk.slice(split)}]});continued=true;
  }return result;
}
export function planPosterLayout(days:LayoutDay[]):PosterLayoutPlan{
  const draft:Array<{mode:PosterLayoutMode;days:PlannedDay[]}>=[];
  for(let index=0;index<days.length;){const day=days[index]!,next=days[index+1],standard=height(day.activities,"standard")<=capacity(),compact=height(day.activities,"compact")<=capacity();
    if(next){const ns=height(next.activities,"standard")<=capacity(),nc=height(next.activities,"compact")<=capacity();if(standard&&ns){draft.push({mode:"standard",days:[{...day,continuation:false},{...next,continuation:false}]});index+=2;continue;}if(compact&&nc){draft.push({mode:"compact",days:[{...day,continuation:false},{...next,continuation:false}]});index+=2;continue;}}
    if(compact){draft.push({mode:standard?"standard":"compact",days:[{...day,continuation:false}]});index++;continue;}draft.push(...densePages(day));index++;
  }
  const pages=draft.map((entry,index)=>({pageNumber:index+1,layoutMode:entry.mode,days:entry.days}));
  const expectedActivityIds=days.flatMap(day=>day.activities.map(activity=>activity.id)),renderedActivityIds=pages.flatMap(page=>page.days.flatMap(day=>day.activities.map(activity=>activity.id))),estimatedHeights=pages.map(page=>Math.max(...page.days.map(day=>height(day.activities,page.layoutMode))));
  const layoutPlanHash=createHash("sha256").update(JSON.stringify(pages.map(page=>({layoutMode:page.layoutMode,days:page.days.map(day=>({dayNumber:day.dayNumber,ids:day.activities.map(activity=>activity.id)}))})))).digest("hex");
  return {pageCount:pages.length,pages,expectedActivityIds,renderedActivityIds,totalActivityCount:expectedActivityIds.length,estimatedHeights,layoutPlanHash};
}
export function validatePosterCompleteness(plan:PosterLayoutPlan){const expected=new Set(plan.expectedActivityIds),rendered=new Set(plan.renderedActivityIds),missingActivityIds=[...expected].filter(id=>!rendered.has(id)),duplicateActivityIds=plan.renderedActivityIds.filter((id,index,all)=>all.indexOf(id)!==index),overflowBlocks=plan.pages.flatMap((page,index)=>page.days.filter(day=>height(day.activities,page.layoutMode)>capacity()).map(day=>`page:${index+1}:day:${day.dayNumber}`));return{valid:missingActivityIds.length===0&&duplicateActivityIds.length===0&&expected.size===rendered.size&&overflowBlocks.length===0,expectedActivityCount:expected.size,renderedActivityCount:rendered.size,missingActivityIds,duplicateActivityIds:[...new Set(duplicateActivityIds)],overflowBlocks};}
