import type { TripInput } from "@/types/trip";

type PairRule={modes:string;duration:string;departure:string;longHaul:boolean};
const pairRules:Record<string,PairRule>={
  "上海-杭州":{modes:"高铁优先",duration:"约1～1.5小时",departure:"建议上午出发",longHaul:false},
  "昆山-上海":{modes:"高铁或市域交通优先",duration:"约0.5～1小时",departure:"可在当天早些时候出发",longHaul:false},
  "长沙-广州":{modes:"高铁优先",duration:"约2.5～3.5小时",departure:"建议上午出发",longHaul:false},
  "苏州-成都":{modes:"飞机更省时，高铁可作为备选",duration:"飞机约3～4小时；高铁约8～10小时",departure:"建议首日上午出发",longHaul:true},
  "北京-云南省":{modes:"飞机更省时",duration:"飞抵昆明约3.5～4.5小时",departure:"建议首日上午出发",longHaul:true},
  "广州-北京":{modes:"飞机更省时，高铁可作为备选",duration:"飞机约3～4小时；高铁约8～10小时",departure:"建议首日上午出发",longHaul:true},
};
const aliases:Record<string,string>={云南:"云南省",云南省:"云南省",昆明:"云南省"};
export function estimateIntercityTransport(input:TripInput){
  if(!input.departureCity)return null;
  const from=input.departureCity.trim().replace(/市$/u,"");const rawTo=input.destination.provinceName||input.destination.city;const to=(aliases[rawTo]||rawTo).replace(/市$/u,"");
  const direct=pairRules[`${from}-${to}`];
  const reverse=pairRules[`${to}-${from}`];
  const rule=direct||reverse;
  if(!rule)return{from,to:input.destination.city,modes:"请按实际车次或航班选择",duration:"大致时间待确认",departure:"建议先确认去返程班次，再安排首尾日",longHaul:false,known:false};
  let modes=rule.modes;
  if(input.transportPreference==="driving"&&!rule.longHaul)modes="自驾更灵活，也可比较高铁";
  if(input.transportPreference==="driving"&&rule.longHaul)modes=`${rule.modes}；跨省长距离不建议连续自驾`;
  return{from,to:input.destination.city,...rule,modes,known:true};
}
