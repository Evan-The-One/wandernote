import type {TripInput,TripPlan} from "@/types/trip";
import type {EmphasisSpan} from "./safe-emphasis";
export type PersonalizationParagraph={text:string;emphasis:EmphasisSpan[]};
const transport:Record<TripInput["transportPreference"],string>={mixed:"步行和公共交通搭配",public_transport:"公共交通为主",taxi:"短途打车为主",walking:"步行为主",driving:"自驾为主"};
function minutes(value:string|null){if(!value)return null;const [h,m]=value.split(":").map(Number);return h!*60+m!;}
function paragraph(text:string,items:Array<{phrase:string;reason:EmphasisSpan["reason"]}>):PersonalizationParagraph{const emphasis:EmphasisSpan[]=[];for(const item of items){const start=text.indexOf(item.phrase);if(start>=0)emphasis.push({start,end:start+item.phrase.length,reason:item.reason});}return{text,emphasis};}
export function buildPersonalizationSummary(plan:TripPlan,input:TripInput):PersonalizationParagraph[]{
  const firstDay=plan.days[0];const departure=minutes(input.preferredDepartureTime);const items:PersonalizationParagraph[]=[];
  if(departure!==null&&departure>=12*60+30){
    const constraint=`${input.preferredDepartureTime}后出发`;
    const decision="首日只保留抵达后的轻量安排";
    items.push(paragraph(`因为你计划${constraint}，所以${decision}，把主要游玩放在后面的完整时段。`,[{phrase:constraint,reason:"user_constraint"},{phrase:decision,reason:"route_decision"}]));
  }else if(input.companionType==="with_children"||input.companionType==="parents"||input.travelers.adults>=3&&input.travelers.children>0){
    const companion=input.companionType==="with_children"||input.travelers.children>0?"带娃出行":"同行人数较多";
    const decision="减少连续步行和频繁换区";
    items.push(paragraph(`考虑到${companion}，每天会${decision}，休息和用餐时间也留得更宽松。`,[{phrase:companion,reason:"companion_decision"},{phrase:decision,reason:"route_decision"}]));
  }else if(input.priorities.includes("late_start")){
    const constraint="晚起下午逛";
    const decision="主要活动从较晚时段开始";
    items.push(paragraph(`你更想${constraint}，行程会让${decision}，晚上也不会为了补行程拖得太晚。`,[{phrase:constraint,reason:"user_constraint"},{phrase:decision,reason:"route_decision"}]));
  }else{
    const areas=[...new Set(firstDay?.activities.map(activity=>activity.area).filter(Boolean)??[])].slice(0,2).join("、");
    const phrase=areas?`第一天先玩${areas}`:`按${input.days}天安排每天重点`;
    items.push(paragraph(`${plan.destination.city}${input.days}天会${phrase}，每天只保留顺序清楚、可以直接照着走的安排。`,[{phrase,reason:"route_decision"}]));
  }
  const stay=plan.strategy.recommendedStayArea?.trim();const move=transport[input.transportPreference];
  if(stay){
    items.push(paragraph(`住宿建议放在${stay}，市内采用${move}，方便每天从住处直接开始。`,[{phrase:stay,reason:"stay_decision"},{phrase:move,reason:"transport_decision"}]));
  }else if(input.departureCity){
    items.push(paragraph(`从${input.departureCity}出发，首日和返程日会为大交通留出时间；到达后采用${move}。`,[{phrase:input.departureCity,reason:"user_constraint"},{phrase:move,reason:"transport_decision"}]));
  }
  return items.slice(0,2);
}
export function validatePersonalizationSummary(paragraphs:PersonalizationParagraph[]){const codes:string[]=[];if(paragraphs.length>2)codes.push("PERSONALIZATION_TOO_MANY_PARAGRAPHS");for(const item of paragraphs){if(item.text.length>100)codes.push("PERSONALIZATION_PARAGRAPH_TOO_LONG");if(item.emphasis.length>4)codes.push("PERSONALIZATION_TOO_MUCH_EMPHASIS");for(const span of item.emphasis){if(span.end-span.start>24||span.start<0||span.end>item.text.length)codes.push("PERSONALIZATION_INVALID_EMPHASIS");}}return [...new Set(codes)];}
