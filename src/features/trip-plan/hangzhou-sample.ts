export const hangzhouSample={title:"杭州三日慢旅行",audience:"情侣或朋友",style:"慢慢逛",priorities:["吃点好的","拍照出片","逛逛人文"],intensity:"轻松适中",stayArea:"湖滨商圈或龙翔桥附近",mainActivities:"每天2～3个",days:[
{day:1,title:"西湖经典慢游",route:"湖滨公园 → 柳浪闻莺 → 南山路",area:"西湖南线",transport:"walk" as const,transportMinutes:[18,15],detail:"沿西湖南线慢慢散步，午后在南山路休息，傍晚看湖景。"},
{day:2,title:"文化与老街",route:"浙江省博物馆孤山馆区 → 北山街 → 小河直街",area:"孤山与运河",transport:"public_transport" as const,transportMinutes:[12,30],detail:"上午看展和逛孤山，午后到小河直街体验运河老街。"},
{day:3,title:"山水与茶香",route:"九溪烟树 → 龙井村周边 → 满觉陇",area:"西湖西南",transport:"taxi" as const,transportMinutes:[15,18],detail:"主要活动集中在西湖西南片区，以轻量徒步和茶文化收尾。"},
]} as const;
