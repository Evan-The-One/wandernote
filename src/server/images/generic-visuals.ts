import sharp from "sharp";

const scenes: Record<string,string> = {
  food: `<ellipse cx="210" cy="160" rx="120" ry="70" fill="#fffaf0" stroke="#295b47" stroke-width="8"/><ellipse cx="210" cy="160" rx="88" ry="45" fill="#e8b65b"/><path d="M145 155c30-45 95-45 130 0M155 175c35-30 80-30 110 0" fill="none" stroke="#7b3f2a" stroke-width="13" stroke-linecap="round"/><path d="M86 72v150M70 72v58M86 72v58M102 72v58M334 72c-35 45-22 85 0 94v56" fill="none" stroke="#295b47" stroke-width="9" stroke-linecap="round"/>`,
  hotel: `<rect x="62" y="72" width="296" height="150" rx="18" fill="#fffaf0" stroke="#295b47" stroke-width="8"/><rect x="88" y="132" width="244" height="72" rx="14" fill="#d9e7dc"/><rect x="108" y="108" width="78" height="52" rx="12" fill="#f2d88f"/><rect x="234" y="108" width="78" height="52" rx="12" fill="#f2d88f"/><path d="M76 222v24M344 222v24M210 72v-24" stroke="#295b47" stroke-width="9" stroke-linecap="round"/>`,
  transport: `<path d="M54 224c90-80 190-96 312-56" fill="none" stroke="#d0b66f" stroke-width="30" stroke-linecap="round"/><path d="M54 224c90-80 190-96 312-56" fill="none" stroke="#fffaf0" stroke-width="5" stroke-dasharray="16 14"/><rect x="112" y="92" width="170" height="82" rx="22" fill="#295b47"/><path d="M146 92l28-38h64l30 38" fill="#d9e7dc" stroke="#295b47" stroke-width="8"/><circle cx="154" cy="182" r="22" fill="#f2d88f" stroke="#295b47" stroke-width="8"/><circle cx="252" cy="182" r="22" fill="#f2d88f" stroke="#295b47" stroke-width="8"/>`,
  rest: `<path d="M88 198h244v44H88z" fill="#295b47"/><path d="M112 198v-72c0-28 22-50 50-50h96c28 0 50 22 50 50v72" fill="#d9e7dc" stroke="#295b47" stroke-width="8"/><rect x="132" y="106" width="72" height="52" rx="14" fill="#fffaf0"/><circle cx="292" cy="70" r="26" fill="#f2d88f"/>`,
  shopping: `<path d="M108 98h204l-16 142H124z" fill="#d9e7dc" stroke="#295b47" stroke-width="8"/><path d="M154 110c0-55 112-55 112 0" fill="none" stroke="#295b47" stroke-width="10"/><circle cx="172" cy="174" r="18" fill="#f2d88f"/><circle cx="248" cy="174" r="18" fill="#f2d88f"/>`,
  entertainment: `<circle cx="210" cy="138" r="76" fill="#f2d88f"/><path d="M56 226c50-56 94-76 140-50 46-68 112-52 168 50" fill="#295b47"/><path d="M76 226c60-38 110-42 150-12 42-36 82-30 118 12" fill="none" stroke="#d9e7dc" stroke-width="10"/>`,
};

export async function genericVisualDataUrl(category: string) {
  const scene=scenes[category]||scenes.rest;
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="420" height="280" viewBox="0 0 420 280"><rect width="420" height="280" rx="24" fill="#edf3ec"/><circle cx="354" cy="48" r="58" fill="#f3d684" opacity=".72"/><path d="M0 246c92-52 158-36 218-8 76 35 134 18 202-16v58H0z" fill="#cfe0d2"/>${scene}</svg>`;
  const buffer=await sharp(Buffer.from(svg)).webp({quality:90}).toBuffer();
  return `data:image/webp;base64,${buffer.toString("base64")}`;
}
