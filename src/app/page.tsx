import Link from "next/link";
import { SectionHeading } from "@/components/section-heading";

const sampleDays = [
  ["Day 1", "湖边初见", "西湖漫步 · 杭帮菜 · 南山路夜景"],
  ["Day 2", "山寺与茶", "灵隐寺 · 梅家坞 · 城市日落"],
  ["Day 3", "人文慢游", "小河直街 · 咖啡馆 · 运河夜色"],
];

export default function Home() {
  return (
    <main>
      <section className="relative overflow-hidden py-20 sm:py-28">
        <div className="absolute -right-24 top-8 h-80 w-80 rounded-full bg-[#dbe9d7] blur-3xl" />
        <div className="absolute -left-24 bottom-0 h-64 w-64 rounded-full bg-[#f3d9ad] blur-3xl" />
        <div className="page-shell relative grid items-center gap-14 lg:grid-cols-[1.05fr_.95fr]">
          <div>
            <span className="inline-flex rounded-full border border-[#245b46]/15 bg-white/70 px-3 py-1.5 text-sm font-semibold text-[#245b46]">AI 私人旅行管家 · V0.1</span>
            <h1 className="mt-6 max-w-3xl text-5xl font-bold leading-[1.08] tracking-[-.04em] sm:text-7xl">
              少做攻略，<br /><span className="text-[#245b46]">多去旅行。</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-[#5d6862]">告诉我们目的地、预算和偏好，一键获得按天规划、符合你节奏的私人旅行攻略。</p>
            <div className="mt-9 flex flex-wrap items-center gap-4">
              <Link href="/create" className="focus-ring rounded-full bg-[#245b46] px-7 py-3.5 font-semibold text-white shadow-lg shadow-[#245b46]/15 hover:-translate-y-0.5">免费开始规划 →</Link>
              <a href="#example" className="focus-ring rounded-full px-5 py-3.5 font-semibold text-[#39443e]">看看示例</a>
            </div>
            <p className="mt-5 text-sm text-[#778079]">无需登录 · 约 1 分钟填写 · 当前为体验版本</p>
          </div>

          <div className="card rotate-1 rounded-[2rem] p-4 sm:p-6">
            <div className="rounded-[1.4rem] bg-gradient-to-br from-[#355f4d] to-[#183c2f] p-6 text-white">
              <p className="text-sm text-white/70">杭州 · 3天2晚</p>
              <h2 className="mt-2 text-2xl font-bold">山水之间的浪漫慢游</h2>
              <div className="mt-6 flex gap-2 text-xs"><span className="rounded-full bg-white/15 px-3 py-1.5">情侣浪漫</span><span className="rounded-full bg-white/15 px-3 py-1.5">美食</span><span className="rounded-full bg-white/15 px-3 py-1.5">摄影</span></div>
            </div>
            <div className="space-y-3 p-2 pt-5">
              {sampleDays.map(([day, title, detail]) => (
                <div key={day} className="flex gap-4 rounded-2xl border border-black/5 bg-white p-4">
                  <span className="text-xs font-bold text-[#287057]">{day}</span>
                  <div><p className="font-bold">{title}</p><p className="mt-1 text-sm text-[#778079]">{detail}</p></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="example" className="page-shell py-20">
        <SectionHeading eyebrow="一份真正可执行的计划" title="不是景点清单，是属于你的旅行节奏" description="从每日顺序、餐饮安排到交通建议，把分散的信息整理成一份清晰、好读、随时可以调整的攻略。" />
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {[
            ["01", "极简输入", "只填写真正影响行程的要素，兴趣最多选三项。"],
            ["02", "按天规划", "每一天都有主题、时间轴、预算和行动建议。"],
            ["03", "随时调整", "不满意第二天？用一句话让旅行管家重新安排。"],
          ].map(([number, title, body]) => (
            <article key={number} className="card rounded-3xl p-7"><span className="text-sm font-bold text-[#d48a35]">{number}</span><h3 className="mt-8 text-xl font-bold">{title}</h3><p className="mt-3 leading-7 text-[#65706a]">{body}</p></article>
          ))}
        </div>
      </section>
    </main>
  );
}
