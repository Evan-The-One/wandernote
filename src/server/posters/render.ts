import sharp from "sharp";
import type{TravelPosterSpec}from "@/schemas/trip-image";

export const POSTER_RENDER_VERSION="sharp_svg_v1";
const WIDTH=1024,HEIGHT=1536;
const esc=(value:string)=>value.replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&apos;"}[char]!));
const wrap=(value:string,max:number,lines=2)=>{const chars=[...value.trim()],out:string[]=[];while(chars.length&&out.length<lines)out.push(chars.splice(0,max).join(""));return out};
const text=(x:number,y:number,value:string,size:number,weight=500,color="#263c32",anchor="start")=>`<text x="${x}" y="${y}" font-family="PingFang SC,Noto Sans CJK SC,Microsoft YaHei,sans-serif" font-size="${size}" font-weight="${weight}" fill="${color}" text-anchor="${anchor}">${esc(value)}</text>`;
const rounded=(x:number,y:number,w:number,h:number,r:number,fill:string,stroke="none")=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}" stroke="${stroke}"/>`;
function dataBuffer(value:string){const match=/^data:image\/[a-z0-9.+-]+;base64,(.+)$/i.exec(value);if(!match)throw Object.assign(new Error("活动图片无效"),{code:"POSTER_VISUAL_MISSING"});return Buffer.from(match[1]!,"base64")}

export async function renderPosterPages(spec:Extract<TravelPosterSpec,{width:1024}>){
  const outputs:Buffer[]=[];
  for(const[pageIndex,page]of spec.pages.entries()){
    let svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">${rounded(0,0,WIDTH,HEIGHT,0,"#fbf8ef")}`;
    for(const[index,line]of wrap(spec.title,22,2).entries())svg+=text(40,62+index*46,line,42,800,"#174c37");
    svg+=text(40,142,`${spec.destination} · ${spec.daysCount}天 · ${page.dayRange}`,18,600,"#68766e")+text(984,52,`${pageIndex+1} / ${spec.pages.length}`,16,700,"#a87930","end");
    const columns=page.days.length,gap=18,left=24,cardWidth=columns===2?(WIDTH-left*2-gap)/2:WIDTH-left*2,top=160,bottom=1266,cardHeight=bottom-top;
    const composites:Array<{input:Buffer;left:number;top:number}>=[];
    for(const[column,day]of page.days.entries()){
      const x=Math.round(left+column*(cardWidth+gap));svg+=rounded(x,top,Math.round(cardWidth),cardHeight,18,"#fffdf8","#cad4ca")+rounded(x+8,top+8,Math.round(cardWidth-16),66,14,"#245b46");
      svg+=text(x+28,top+41,`Day ${day.dayNumber}${day.date?`  ${day.date}`:""}`,27,800,"#fff")+text(x+28,top+62,day.title.slice(0,24),15,600,"#e6efe8");
      const count=day.activities.length,rowHeight=Math.min(174,Math.floor((cardHeight-92)/Math.max(count,1))),timelineX=x+31,textX=x+56,imageW=columns===2?142:245,imageH=Math.max(72,Math.min(104,rowHeight-34)),imageX=Math.round(x+cardWidth-imageW-16),textW=imageX-textX-12;
      for(let i=0;i<count;i++){
        const activity=day.activities[i]!,rowY=top+88+i*rowHeight;
        if(i<count-1)svg+=`<line x1="${timelineX}" y1="${rowY+38}" x2="${timelineX}" y2="${rowY+rowHeight+8}" stroke="#cbd6cc" stroke-width="2" stroke-dasharray="3 7" stroke-linecap="round"/>`;
        svg+=`<circle cx="${timelineX}" cy="${rowY+25}" r="6" fill="#245b46"/>`+text(textX,rowY+19,activity.time,columns===2?18:20,800,"#245b46");
        wrap(activity.name,Math.max(8,Math.floor(textW/(columns===2?22:24))),2).forEach((line,n)=>svg+=text(textX,rowY+48+n*25,line,columns===2?22:24,800,"#15271e"));
        wrap(activity.note,Math.max(9,Math.floor(textW/(columns===2?16:18))),2).forEach((line,n)=>svg+=text(textX,rowY+99+n*20,line,columns===2?16:18,500,"#34443b"));
        const visual=await sharp(dataBuffer(activity.visualAsset.dataUrl)).resize(imageW,imageH,{fit:"cover"}).jpeg({quality:86}).toBuffer();composites.push({input:visual,left:imageX,top:rowY+9});
      }
    }
    const tips=(spec.preTripAdvice&&pageIndex===spec.pages.length-1?[spec.preTripAdvice.transport,spec.preTripAdvice.accommodation,spec.preTripAdvice.clothing,spec.preTripAdvice.photoSpots,spec.preTripAdvice.food,spec.preTripAdvice.timing]:page.tips).filter(Boolean).slice(0,6);
    svg+=rounded(40,1284,944,188,18,"#f2f1e8")+text(60,1314,"出发前看一眼",19,800,"#245b46");tips.forEach((tip,index)=>{const col=index%3,row=Math.floor(index/3),x=60+col*306,y=1350+row*51;wrap(tip,15,2).forEach((line,n)=>svg+=text(x,y+n*18,line,14,600,"#34443b"));});
    svg+=text(60,1460,"景点图片为 AI 视觉示意，请以实际现场为准。",12,500,"#68766e")+text(512,1498,"一键出发",20,800,"#245b46","middle")+text(512,1518,"T R I P   R E A D Y",12,600,"#a87930","middle")+text(512,1534,"yjchufa.com",12,500,"#718078","middle")+`</svg>`;
    const output=await sharp(Buffer.from(svg)).composite(composites).jpeg({quality:92,chromaSubsampling:"4:4:4"}).toBuffer();
    const metadata=await sharp(output).metadata();if(metadata.width!==WIDTH||metadata.height!==HEIGHT)throw Object.assign(new Error("海报尺寸校验失败"),{code:"POSTER_RENDER_INVALID"});outputs.push(output);
  }
  return outputs;
}
