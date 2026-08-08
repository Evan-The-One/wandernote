import {readFileSync} from "node:fs";
import {dirname,resolve} from "node:path";
import {openSync,type Font} from "fontkit";

type FontWeight=400|600|800;
type FontSlice={file:string;ranges:Array<[number,number]>};
type TextAudit={glyphs:number;chineseGlyphs:number;missingGlyphs:number};

const fontPackageDirectory=resolve(process.cwd(),"node_modules/@fontsource/noto-sans-sc");
const sliceCache=new Map<FontWeight,FontSlice[]>();
const fontCache=new Map<string,Font>();

function slices(weight:FontWeight){
  const cached=sliceCache.get(weight);if(cached)return cached;
  const cssPath=resolve(fontPackageDirectory,`${weight}.css`);
  const base=dirname(cssPath),css=readFileSync(cssPath,"utf8"),items:FontSlice[]=[];
  for(const block of css.split("@font-face").slice(1)){
    const file=block.match(/src:\s*url\(([^)]+\.woff2)\)/)?.[1];
    const unicode=block.match(/unicode-range:\s*([^;]+)/)?.[1];
    if(!file||!unicode)continue;
    const ranges:Array<[number,number]>=[];
    for(const raw of unicode.split(",")){
      const match=raw.trim().match(/^U\+([0-9a-f]+)(?:-([0-9a-f]+))?$/i);if(!match)continue;
      ranges.push([parseInt(match[1]!,16),parseInt(match[2]||match[1]!,16)]);
    }
    items.push({file:resolve(base,file),ranges});
  }
  if(!items.length)throw Object.assign(new Error("中文字体清单加载失败"),{code:"POSTER_FONT_LOAD_FAILED"});
  sliceCache.set(weight,items);return items;
}

function fontFor(codePoint:number,weight:FontWeight){
  const slice=slices(weight).find(item=>item.ranges.some(([start,end])=>codePoint>=start&&codePoint<=end));
  if(!slice)throw Object.assign(new Error(`海报字体缺少 U+${codePoint.toString(16).toUpperCase()} 字形`),{code:"POSTER_FONT_GLYPH_MISSING"});
  let font=fontCache.get(slice.file);if(!font){font=openSync(slice.file) as Font;fontCache.set(slice.file,font);}return font;
}

const normalizeWeight=(weight:number):FontWeight=>weight>=750?800:weight>=550?600:400;
const esc=(value:string)=>value.replace(/[&<>"]/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[char]!));

export function outlinedText(x:number,y:number,value:string,size:number,weight=500,color="#263c32",anchor="start"){
  const fontWeight=normalizeWeight(weight),glyphs:Array<{path:string;advance:number;scale:number}>=[];
  let width=0,chineseGlyphs=0;
  for(const char of value){
    const codePoint=char.codePointAt(0)!;const font=fontFor(codePoint,fontWeight);const run=font.layout(char);const glyph=run.glyphs[0],position=run.positions[0];
    if(!glyph||glyph.id===0||!position)throw Object.assign(new Error(`海报字体无法绘制 ${esc(char)}`),{code:"POSTER_FONT_GLYPH_MISSING"});
    const scale=size/font.unitsPerEm,advance=position.xAdvance*scale;glyphs.push({path:glyph.path.toSVG(),advance,scale});width+=advance;
    if(codePoint>=0x3400&&codePoint<=0x9fff)chineseGlyphs++;
  }
  const start=anchor==="middle"?x-width/2:anchor==="end"?x-width:x;let cursor=start,body="";
  for(const glyph of glyphs){body+=`<path d="${glyph.path}" transform="translate(${cursor.toFixed(2)} ${y}) scale(${glyph.scale.toFixed(6)} -${glyph.scale.toFixed(6)})" fill="${color}"/>`;cursor+=glyph.advance;}
  return{svg:`<g data-poster-text="${esc(value)}">${body}</g>`,audit:{glyphs:glyphs.length,chineseGlyphs,missingGlyphs:0} satisfies TextAudit};
}

export function assertPosterTextAudit(audit:TextAudit){
  if(audit.glyphs<20||audit.chineseGlyphs<8||audit.missingGlyphs)throw Object.assign(new Error("海报中文文字完整性校验失败"),{code:"POSTER_TEXT_AUDIT_FAILED"});
}
