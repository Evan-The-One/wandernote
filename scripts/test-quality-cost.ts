import assert from "node:assert/strict";
import { migrateTripInput } from "../src/schemas/migration";
import { estimateIntercityTransport } from "../src/features/trip-plan/intercity-transport";
import { estimateModelCost } from "../src/server/ai/model-pricing";
import { startOfShanghaiDay } from "../src/server/database/trips";
import { normalizeTripPlanForQuality, validateTripPlanQuality } from "../src/server/validation/trip-plan-quality";
import type { Activity, TripPlan } from "../src/types/trip";

const base=migrateTripInput({schemaVersion:"0.2",destination:{city:"常州",country:"中国",type:"city",scope:"single_city",provinceName:null},days:2,travelStyle:"slow",datePreference:{type:"undecided",startDate:null,approximateText:null},budget:{mode:"unrestricted",amount:null,scope:null,includesAccommodation:null,includesIntercityTransport:null,currency:"CNY"},priorities:[],detailPreferences:[],departureCity:"昆山",companionType:"undecided",travelers:{adults:1,children:0,seniors:0},preferredWakeTime:null,preferredDepartureTime:"13:00",transportPreference:"driving",dayTripPreference:false,additionalRequirements:null});
assert.ok(base);
const driving=estimateIntercityTransport(base!); assert.ok(driving); assert.match(driving!.recommendation,/自驾/); assert.doesNotMatch(JSON.stringify(driving),/车次|航班|候机|进站/);
const unknown=estimateIntercityTransport({...base!,departureCity:"阿勒泰",destination:{...base!.destination,city:"漠河"}}); assert.equal(unknown,null);
assert.equal(startOfShanghaiDay(new Date("2026-07-16T12:00:00Z")).toISOString(),"2026-07-15T16:00:00.000Z");
assert.equal(Number(estimateModelCost("gpt-5.4-mini",1_000_000,1_000_000).toFixed(2)),5.25);
const activity=(id:string,type:Activity["type"],name:string,startTime:string,endTime:string):Activity=>({id,type,startTime,endTime,name,area:"市中心",reason:"测试",durationMinutes:Number(endTime.slice(0,2))*60+Number(endTime.slice(3))-Number(startTime.slice(0,2))*60-Number(startTime.slice(3)),estimatedCost:null,transportToNext:null,tips:[],photoTips:[]});
const rawPlan:TripPlan={schemaVersion:"0.2",tripId:"test",status:"completed",title:"测试",summary:"测试",destination:base!.destination,strategy:{pace:"慢",recommendedStayArea:"市中心",stayReason:"方便",transportAdvice:"公共交通"},budget:{mode:"unrestricted",currency:"CNY",estimateType:"none",userBudgetAmount:null,userBudgetScope:null,includesAccommodation:null,includesIntercityTransport:null,estimatedTotal:null,estimatedRange:null,dailyCostTotal:null,unallocatedCost:null,unallocatedExplanation:null,includedItems:[],excludedItems:[],notes:"暂不限制"},days:[{dayNumber:1,date:null,title:"抵达",theme:"轻松",intensity:"easy",estimatedWalkingKm:2,estimatedCost:null,activities:[activity("m","meal","午餐","15:00","16:00"),activity("c1","coffee","咖啡休息","16:10","16:40"),activity("c2","coffee","咖啡馆停留","17:00","17:30"),activity("d","meal","晚餐","18:00","19:00")],dayTips:[]}],generalTips:[],dataDisclaimer:"非实时",createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};
const normalized=normalizeTripPlanForQuality(rawPlan,{...base!,days:1});assert.equal(normalized.days[0]!.activities.some(item=>item.name==="午餐"),false);assert.equal(normalized.days[0]!.activities.filter(item=>item.type==="coffee").length,1);assert.equal(validateTripPlanQuality(normalized,{...base!,days:1}).issues.some(item=>item.code==="UNREQUESTED_COFFEE_OVERUSE"),false);
console.log("Quality, transport and cost safeguards passed.");
