import type { TripInput } from "@/types/trip";

export const randomDestinationCities = [
  "北京", "青岛", "西安", "洛阳", "成都", "重庆", "长沙", "武汉", "泉州", "厦门",
  "广州", "桂林", "昆明", "大理", "贵阳", "杭州", "苏州", "南京", "哈尔滨", "乌鲁木齐",
] as const;

export const nearbyCityOptions: Record<string,string>={杭州:"绍兴",苏州:"无锡",成都:"都江堰",厦门:"泉州",长沙:"岳阳",广州:"佛山",南京:"扬州",青岛:"威海"};

export const provinceDestinations: Record<string, { name: string; capital: string }> = {
  北京:{name:"北京市",capital:"北京"},上海:{name:"上海市",capital:"上海"},天津:{name:"天津市",capital:"天津"},重庆:{name:"重庆市",capital:"重庆"},
  河北:{name:"河北省",capital:"石家庄"},山西:{name:"山西省",capital:"太原"},辽宁:{name:"辽宁省",capital:"沈阳"},吉林:{name:"吉林省",capital:"长春"},黑龙江:{name:"黑龙江省",capital:"哈尔滨"},
  江苏:{name:"江苏省",capital:"南京"},浙江:{name:"浙江省",capital:"杭州"},安徽:{name:"安徽省",capital:"合肥"},福建:{name:"福建省",capital:"福州"},江西:{name:"江西省",capital:"南昌"},山东:{name:"山东省",capital:"济南"},
  河南:{name:"河南省",capital:"郑州"},湖北:{name:"湖北省",capital:"武汉"},湖南:{name:"湖南省",capital:"长沙"},广东:{name:"广东省",capital:"广州"},海南:{name:"海南省",capital:"海口"},
  四川:{name:"四川省",capital:"成都"},贵州:{name:"贵州省",capital:"贵阳"},云南:{name:"云南省",capital:"昆明"},陕西:{name:"陕西省",capital:"西安"},甘肃:{name:"甘肃省",capital:"兰州"},青海:{name:"青海省",capital:"西宁"},
  台湾:{name:"台湾省",capital:"台北"},内蒙古:{name:"内蒙古自治区",capital:"呼和浩特"},广西:{name:"广西壮族自治区",capital:"南宁"},西藏:{name:"西藏自治区",capital:"拉萨"},宁夏:{name:"宁夏回族自治区",capital:"银川"},新疆:{name:"新疆维吾尔自治区",capital:"乌鲁木齐"},
};

export function identifyDestination(value: string): { type: TripInput["destination"]["type"]; normalizedName: string; provinceName: string | null; capital: string | null } {
  const clean = value.trim().replace(/(省|市|壮族自治区|回族自治区|维吾尔自治区|自治区)$/u, "");
  const province = provinceDestinations[clean];
  if (province && !["北京","上海","天津","重庆"].includes(clean)) return { type:"province", normalizedName:province.name, provinceName:province.name, capital:province.capital };
  if (province) return { type:"city", normalizedName:province.capital, provinceName:province.name, capital:province.capital };
  if (/地区|区域|周边|沿线|长三角|珠三角|川西|江南/.test(value)) return { type:"region", normalizedName:value.trim(), provinceName:null, capital:null };
  if (/景区|公园|古镇|山$|湖$|岛$/.test(value)) return { type:"attraction", normalizedName:value.trim(), provinceName:null, capital:null };
  return { type:"city", normalizedName:value.trim(), provinceName:null, capital:null };
}
