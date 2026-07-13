export const hangzhouSample = {
  title: "杭州三日慢旅行",
  audience: "情侣或朋友",
  style: "慢旅行",
  priorities: ["美食", "拍照", "文化"],
  intensity: "轻松适中",
  stayArea: "湖滨商圈或龙翔桥附近",
  mainActivities: "每天2～3个",
  days: [
    { day: 1, title: "西湖经典慢游", route: "湖滨公园 → 柳浪闻莺 → 南山路", detail: "上午从湖滨轻松出发，沿西湖南线慢慢散步；午后在南山路喝咖啡，傍晚看湖景和城市灯光。" },
    { day: 2, title: "文化与老街", route: "浙江省博物馆孤山馆区 → 北山街 → 小河直街", detail: "上午看展和逛孤山，午后转往小河直街，在运河边体验杭州老街与社区生活。" },
    { day: 3, title: "山水与茶香", route: "九溪烟树 → 龙井村周边 → 满觉陇", detail: "把主要活动集中在西湖西南片区，以轻量徒步、茶文化和安静拍照作为旅行收尾。" },
  ],
} as const;
