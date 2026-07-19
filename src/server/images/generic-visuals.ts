import sharp from "sharp";

const labels: Record<string, string> = {
  hotel: "住宿休息", transport: "出发在路上", rest: "稍作休息", food: "当地用餐", shopping: "逛街闲游", entertainment: "晚间体验",
};

export async function genericVisualDataUrl(category: string) {
  const label = labels[category] || "旅行途中";
  const symbol = category === "hotel" ? "⌂" : category === "transport" ? "→" : category === "food" ? "◇" : "○";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="420" height="280"><rect width="420" height="280" fill="#eef1e8"/><circle cx="210" cy="112" r="54" fill="#d9e5d8"/><text x="210" y="132" text-anchor="middle" font-size="58" font-family="Arial" fill="#245b46">${symbol}</text><text x="210" y="212" text-anchor="middle" font-size="24" font-family="PingFang SC,Microsoft YaHei,Arial" fill="#245b46">${label}</text></svg>`;
  const buffer = await sharp(Buffer.from(svg)).webp({ quality: 82 }).toBuffer();
  return `data:image/webp;base64,${buffer.toString("base64")}`;
}
