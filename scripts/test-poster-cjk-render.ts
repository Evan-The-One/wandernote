import assert from "node:assert/strict";
import {mkdtemp,writeFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import sharp from "sharp";
import jsQR from "jsqr";
import {travelPosterSpecSchema} from "../src/schemas/trip-image";
import {renderPosterPages,POSTER_QR_URL,POSTER_RENDER_VERSION} from "../src/server/posters/render";

async function main(){
const image=await sharp({create:{width:480,height:320,channels:3,background:"#b9db8a"}}).webp().toBuffer();
const dataUrl=`data:image/webp;base64,${image.toString("base64")}`;
const activities=[
  ["09:00","西湖边散步","沿湖慢慢走，看看清晨水景"],
  ["11:30","杭州风味午餐","选择清淡的本地家常菜"],
  ["14:00","灵隐寺","留出时间安静参观古寺"],
] as const;
const output=travelPosterSpecSchema.parse({
  kind:"travel_poster",version:"oneclick_travel_semantic_qr_v10",tripId:"00000000-0000-4000-8000-000000000001",tripVersion:1,aspectRatio:"3:4",width:1024,height:1536,
  title:"杭州一日轻松旅行",subtitle:"从湖边走到山林",destination:"杭州",daysCount:1,model:"test",quality:"low",estimatedCostUsd:0,
  pages:[{pageNumber:1,dayRange:"Day 1",tips:["穿舒适的鞋","出发前确认开放时间","傍晚注意保暖"],days:[{dayNumber:1,date:null,title:"湖边与山林",city:"杭州",tips:["傍晚注意保暖"],activities:activities.map(([time,name,note],index)=>({time,name,note,category:index===1?"food":"attraction",visualAsset:{id:`00000000-0000-4000-8000-00000000000${index+2}`,cacheKey:String(index+1).repeat(40),dataUrl,category:index===1?"food":"attraction",altText:name,reused:false}}))}]}],
  preTripAdvice:{transport:"市区以步行和公交为主",accommodation:"西湖湖滨一带住宿",clothing:"穿舒适的鞋",photoSpots:"湖边和山门适合拍照",food:"午餐尝尝杭州家常菜",timing:"出发前确认开放时间"},
});
assert.equal(POSTER_RENDER_VERSION,"sharp_svg_outlined_cjk_qr_v6");
const [jpeg]=await renderPosterPages(output as Extract<typeof output,{width:1024}>);
assert(jpeg && jpeg.byteLength>40_000,"海报 JPEG 不应为空");
const metadata=await sharp(jpeg).metadata();
assert.equal(metadata.width,1024);assert.equal(metadata.height,1536);assert.equal(metadata.format,"jpeg");
const stats=await sharp(jpeg).stats();
assert(stats.channels.some(channel=>channel.stdev>10),"海报不能是空白图片");
const qrRegion=await sharp(jpeg).extract({left:890,top:1448,width:100,height:88}).resize(400,352,{kernel:"nearest"}).ensureAlpha().raw().toBuffer({resolveWithObject:true});
const decoded=jsQR(new Uint8ClampedArray(qrRegion.data),qrRegion.info.width,qrRegion.info.height);
assert.equal(decoded?.data,POSTER_QR_URL,"最终 JPEG 内的二维码必须可解码到公开官网活动链接");
const dir=await mkdtemp(join(tmpdir(),"oneclick-poster-"));
await writeFile(join(dir,"poster-cjk.jpg"),jpeg);
console.log(`poster-cjk-render: ok (${jpeg.byteLength} bytes, ${dir})`);
}
main().catch(error=>{console.error(error);process.exit(1)});
