import type { TripInput } from "@/types/trip";

type PairRule={driving?:string;rail?:string;flight?:string;longHaul:boolean};
const pairRules:Record<string,PairRule>={
  "昆山-常州":{driving:"约1.5～2小时",rail:"高铁车程约0.5～1小时，另需预留进站和接驳",longHaul:false},
  "上海-杭州":{driving:"约2.5～3.5小时",rail:"高铁车程约1～1.5小时，另需预留进站和接驳",longHaul:false},
  "苏州-南京":{driving:"约2.5～3.5小时",rail:"高铁车程约1～2小时，另需预留进站和接驳",longHaul:false},
  "北京-天津":{driving:"约2～3小时",rail:"高铁车程约0.5～1小时，另需预留进站和接驳",longHaul:false},
  "广州-深圳":{driving:"约2～3小时",rail:"高铁车程约0.5～1小时，另需预留进站和接驳",longHaul:false},
  "昆山-上海":{driving:"约1～1.5小时",rail:"高铁或市域交通约0.5～1小时",longHaul:false},
  "长沙-广州":{driving:"约7～9小时，途中应安排休息",rail:"高铁车程约2.5～3.5小时，另需预留接驳",longHaul:true},
  "苏州-成都":{driving:"约20～24小时，不建议连续自驾",rail:"高铁约8～10小时",flight:"飞行及前后接驳总计约5～7小时",longHaul:true},
  "南京-云南省":{rail:"高铁约10～13小时",flight:"飞行及前后接驳总计约5～7小时",longHaul:true},
  "北京-云南省":{rail:"高铁通常超过11小时",flight:"飞行及前后接驳总计约6～8小时",longHaul:true},
  "广州-北京":{rail:"高铁约8～10小时",flight:"飞行及前后接驳总计约5～7小时",longHaul:true},
};
const aliases:Record<string,string>={云南:"云南省",云南省:"云南省",昆明:"云南省"};
function departureImpact(input:TripInput,rule:PairRule){const time=input.preferredDepartureTime; if(!time)return rule.longHaul?"建议首日上午出发，第一天只安排抵达后的轻量活动":"抵达后可按剩余时间安排同片区活动";return `${time}出发，${rule.longHaul?"第一天应降低活动密度":"抵达后再开始当天活动"}`;}
export function estimateIntercityTransport(input:TripInput){
  if(!input.departureCity)return null;
  const from=input.departureCity.trim().replace(/市$/u,""); const rawTo=input.destination.provinceName||input.destination.city; const normalizedTo=(aliases[rawTo]||rawTo).replace(/市$/u,"");
  const rule=pairRules[`${from}-${normalizedTo}`]||pairRules[`${normalizedTo}-${from}`]; if(!rule)return null;
  let recommendation=""; let duration="";
  if(input.transportPreference==="driving") { if(!rule.driving)return null; recommendation=rule.longHaul?"长距离不建议连续自驾，优先比较高铁或飞机":"推荐自驾"; duration=rule.driving; }
  else if(input.transportPreference==="public_transport") { recommendation=rule.flight&&rule.longHaul?"飞机更省时；高铁适合希望减少机场接驳时比较":"更推荐高铁，整体时间更稳定"; duration=[rule.rail,rule.flight].filter(Boolean).join("；"); }
  else { recommendation=rule.flight&&rule.longHaul?"大交通优先飞机或高铁，到达后组合地铁、打车和步行":"大交通优先高铁，到达后组合市内交通"; duration=[rule.rail,rule.flight].filter(Boolean).join("；"); }
  if(!duration||!recommendation)return null;
  return {from,to:input.destination.city,recommendation,duration,departureImpact:departureImpact(input,rule),returnImpact:rule.longHaul?"最后一天减少活动，并为返程与接驳预留充足时间":"最后一天优先安排住宿或交通枢纽附近活动",longHaul:rule.longHaul};
}
