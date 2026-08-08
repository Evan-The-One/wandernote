import sharp from "sharp";
import {readFile} from "node:fs/promises";
import {join} from "node:path";
import type{TravelPosterSpec}from "@/schemas/trip-image";
import {assertPosterTextAudit,outlinedText} from "./font-paths";

export const POSTER_RENDER_VERSION="sharp_svg_outlined_cjk_v5";
const WIDTH=1024,HEIGHT=1536;
const wrap=(value:string,max:number,lines=2)=>{const chars=[...value.trim()],out:string[]=[];while(chars.length&&out.length<lines)out.push(chars.splice(0,max).join(""));return out};
const rounded=(x:number,y:number,w:number,h:number,r:number,fill:string,stroke="none")=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}" stroke="${stroke}"/>`;
const adviceLabels=["出行建议","住宿建议","穿着建议","拍照打卡","美食推荐","时间安排"] as const;
function adviceIcon(index:number,x:number,y:number){
  const stroke=index%2===0?"#1f6b4f":"#a87930",common=`fill="none" stroke="${stroke}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"`;
  const paths=[
    `<rect x="${x+3}" y="${y+8}" width="22" height="13" rx="4" ${common}/><path d="M${x+7} ${y+8}l3-5h8l3 5M${x+8} ${y+23}v2M${x+21} ${y+23}v2" ${common}/>`,
    `<path d="M${x+2} ${y+13}L${x+14} ${y+3}l12 10M${x+5} ${y+11}v15h18V${y+11}M${x+11} ${y+26}v-8h6v8" ${common}/>`,
    `<path d="M${x+9} ${y+3}L${x+2} ${y+8}l4 7 3-2v13h11V${y+13}l3 2 4-7-7-5c-2 5-7 5-11 0Z" ${common}/>`,
    `<rect x="${x+2}" y="${y+7}" width="24" height="18" rx="4" ${common}/><path d="M${x+8} ${y+7}l2-4h8l2 4" ${common}/><circle cx="${x+14}" cy="${y+16}" r="5" ${common}/>`,
    `<path d="M${x+3} ${y+16}h22c-1 7-5 10-11 10s-10-3-11-10ZM${x+7} ${y+12}c1-3 4-5 7-5s6 2 7 5M${x+14} ${y+7}V${y+3}" ${common}/>`,
    `<circle cx="${x+14}" cy="${y+14}" r="12" ${common}/><path d="M${x+14} ${y+7}v8l5 3" ${common}/>`
  ];return paths[index]||paths[5];
}
function dataBuffer(value:string){const match=/^data:image\/[a-z0-9.+-]+;base64,(.+)$/i.exec(value);if(!match)throw Object.assign(new Error("活动图片无效"),{code:"POSTER_VISUAL_MISSING"});return Buffer.from(match[1]!,"base64")}

export async function renderPosterPages(spec:Extract<TravelPosterSpec,{width:1024}>){
  const outputs:Buffer[]=[];
  const brandIcon=await sharp(await readFile(join(process.cwd(),"public/brand/icon-64.png"))).resize(42,42).png().toBuffer();
  for(const[pageIndex,page]of spec.pages.entries()){
    const pageAudit={glyphs:0,chineseGlyphs:0,missingGlyphs:0};
    const text=(x:number,y:number,value:string,size:number,weight=500,color="#263c32",anchor="start")=>{const rendered=outlinedText(x,y,value,size,weight,color,anchor);pageAudit.glyphs+=rendered.audit.glyphs;pageAudit.chineseGlyphs+=rendered.audit.chineseGlyphs;return rendered.svg;};
    let svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">${rounded(0,0,WIDTH,HEIGHT,0,"#f6faf5")}`;
    for(const[index,line]of wrap(spec.title,22,2).entries())svg+=text(40,62+index*46,line,42,800,"#174c37");
    svg+=text(40,142,`${spec.destination} · ${spec.daysCount}天 · ${page.dayRange}`,18,600,"#68766e")+text(984,52,`${pageIndex+1} / ${spec.pages.length}`,16,700,"#a87930","end");
    svg+=rounded(40,150,92,8,4,"#f2c14e");
    const columns=page.days.length,gap=18,left=24,cardWidth=columns===2?(WIDTH-left*2-gap)/2:WIDTH-left*2,top=172,bottom=1266,cardHeight=bottom-top;
    const composites:Array<{input:Buffer;left:number;top:number}>=[];
    for(const[column,day]of page.days.entries()){
      const x=Math.round(left+column*(cardWidth+gap));svg+=rounded(x,top,Math.round(cardWidth),cardHeight,22,"#ffffff","#d8e4da")+rounded(x+8,top+8,Math.round(cardWidth-16),66,16,"#1f6b4f");
      svg+=text(x+28,top+41,`Day ${day.dayNumber}${day.date?`  ${day.date}`:""}`,27,800,"#fff")+text(x+28,top+62,day.title.slice(0,24),15,600,"#e6efe8");
      const count=day.activities.length,rowHeight=Math.min(174,Math.floor((cardHeight-92)/Math.max(count,1))),timelineX=x+31,textX=x+56,imageW=columns===2?142:245,imageH=Math.max(72,Math.min(104,rowHeight-34)),imageX=Math.round(x+cardWidth-imageW-16),textW=imageX-textX-12;
      for(let i=0;i<count;i++){
        const activity=day.activities[i]!,rowY=top+88+i*rowHeight;
        if(i<count-1)svg+=`<line x1="${timelineX}" y1="${rowY+38}" x2="${timelineX}" y2="${rowY+rowHeight+8}" stroke="#cbd6cc" stroke-width="2" stroke-dasharray="3 7" stroke-linecap="round"/>`;
        svg+=`<circle cx="${timelineX}" cy="${rowY+25}" r="7" fill="${i%2===0?"#f2c14e":"#b9db8a"}" stroke="#1f6b4f" stroke-width="2"/>`+text(textX,rowY+19,activity.time,columns===2?18:20,800,"#1f6b4f");
        wrap(activity.name,Math.max(8,Math.floor(textW/(columns===2?22:24))),2).forEach((line,n)=>svg+=text(textX,rowY+48+n*25,line,columns===2?22:24,800,"#15271e"));
        wrap(activity.note,Math.max(9,Math.floor(textW/(columns===2?16:18))),2).forEach((line,n)=>svg+=text(textX,rowY+99+n*20,line,columns===2?16:18,500,"#34443b"));
        const visual=await sharp(dataBuffer(activity.visualAsset.dataUrl)).resize(imageW,imageH,{fit:"cover"}).jpeg({quality:86}).toBuffer();composites.push({input:visual,left:imageX,top:rowY+9});
      }
    }
    const tips=(spec.preTripAdvice&&pageIndex===spec.pages.length-1?[spec.preTripAdvice.transport,spec.preTripAdvice.accommodation,spec.preTripAdvice.clothing,spec.preTripAdvice.photoSpots,spec.preTripAdvice.food,spec.preTripAdvice.timing]:page.tips).filter(Boolean).slice(0,6);
    svg+=rounded(40,1284,944,188,22,"#eef5ec","#d8e4da")+rounded(56,1298,122,30,15,"#1f6b4f")+text(117,1319,"出发前看一眼",16,800,"#fff","middle");tips.forEach((tip,index)=>{const col=index%3,row=Math.floor(index/3),x=58+col*306,y=1338+row*58;svg+=rounded(x,y,30,30,10,index%2===0?"#dcead9":"#fff2d9")+adviceIcon(index,x+1,y+1)+text(x+39,y+13,adviceLabels[index]||"旅行提醒",14,800,"#245b46");wrap(tip,15,2).forEach((line,n)=>svg+=text(x+39,y+33+n*16,line,12,500,"#526159"));});
    svg+=text(60,1460,"景点图片为 AI 视觉示意，请以实际现场为准。",12,500,"#68766e")+text(530,1498,"一键出发",20,800,"#245b46","middle")+text(530,1518,"OneClick Travel",12,600,"#a87930","middle")+text(530,1534,"yjchufa.com",12,500,"#718078","middle")+`</svg>`;
    assertPosterTextAudit(pageAudit);
    composites.push({input:brandIcon,left:414,top:1480});
    const output=await sharp(Buffer.from(svg)).composite(composites).jpeg({quality:92,chromaSubsampling:"4:4:4"}).toBuffer();
    const metadata=await sharp(output).metadata();if(metadata.width!==WIDTH||metadata.height!==HEIGHT)throw Object.assign(new Error("海报尺寸校验失败"),{code:"POSTER_RENDER_INVALID"});outputs.push(output);
  }
  return outputs;
}
