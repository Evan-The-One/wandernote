import { tripInputSchema, tripPlanSchema } from "../../src/schemas/trip";

const budget={mode:"unrestricted" as const,currency:"CNY" as const,estimateType:"none" as const,userBudgetAmount:null,userBudgetScope:null,includesAccommodation:null,includesIntercityTransport:null,estimatedTotal:null,estimatedRange:null,dailyCostTotal:null,unallocatedCost:null,unallocatedExplanation:null,includedItems:[],excludedItems:[],notes:"测试夹具不包含精确预算"};

function build(city:string,dayCount:number,style:"fast_paced"|"slow"|"lazy",names:string[]){
  const input=tripInputSchema.parse({schemaVersion:"0.2",destination:{city,country:"中国",type:"city",scope:"single_city",provinceName:null},days:dayCount,travelStyle:style,datePreference:{type:"undecided",startDate:null,approximateText:null},budget:{mode:"unrestricted",amount:null,scope:null,includesAccommodation:null,includesIntercityTransport:null,currency:"CNY"},priorities:["culture"],detailPreferences:[],departureCity:null,companionType:"undecided",travelers:{adults:1,children:0,seniors:0},preferredWakeTime:null,preferredDepartureTime:null,transportPreference:"public_transport",dayTripPreference:false,additionalRequirements:null});
  const days=Array.from({length:dayCount},(_,dayIndex)=>({dayNumber:dayIndex+1,date:null,title:`${city}第${dayIndex+1}天`,theme:"城市与人文",intensity:style==="fast_paced"?"intense" as const:style==="lazy"?"easy" as const:"moderate" as const,estimatedWalkingKm:style==="fast_paced"?8:5,estimatedCost:null,activities:names.slice(0,style==="fast_paced"?5:4).map((name,index)=>({id:`${city}-${dayIndex+1}-${index+1}`,type:index===2?"meal" as const:"attraction" as const,startTime:`${String(9+index*2).padStart(2,"0")}:00`,endTime:`${String(10+index*2).padStart(2,"0")}:20`,name:index===2?`${city}当地午餐`:name,area:city,reason:"人工构造的非私人测试地点",durationMinutes:80,estimatedCost:null,transportToNext:index===(style==="fast_paced"?4:3)?null:{method:"public_transport" as const,durationMinutes:20,description:"公共交通前往"},tips:[],photoTips:[]})),dayTips:[]}));
  const plan=tripPlanSchema.parse({schemaVersion:"0.2",tripId:`fixture-${city}`,status:"completed",title:`${city}${dayCount}天测试行程`,summary:"仅用于自动化测试，不含真实用户数据",destination:{city,country:"中国"},strategy:{pace:style,recommendedStayArea:`${city}中心区域`,stayReason:"便于测试连续路线",transportAdvice:"公共交通"},budget,days,generalTips:[],dataDisclaimer:"人工测试夹具",createdAt:"2026-01-01T00:00:00.000Z",updatedAt:"2026-01-01T00:00:00.000Z"});
  return {input,plan};
}

export const revisionFixtures={
  hangzhou:build("杭州",3,"slow",["西湖","浙江省博物馆","河坊街","京杭大运河"]),
  suzhou:build("苏州",2,"fast_paced",["拙政园","苏州博物馆","平江路","狮子林","金鸡湖"]),
  shanghai:build("上海",2,"lazy",["外滩","上海博物馆","豫园","武康路"]),
};
