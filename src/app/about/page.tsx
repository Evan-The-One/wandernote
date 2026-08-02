import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import {AboutRouteIllustration} from "@/components/travel-illustrations";
import {AppIcon} from "@/components/app-icons";

export default function AboutPage() {
  const email = process.env.PUBLIC_CONTACT_EMAIL;
  return <main className="app-container py-8 sm:py-16">
    <section className="grid items-center gap-9 lg:grid-cols-[1fr_.9fr] lg:gap-16">
      <div><BrandMark/><p className="mt-8 text-sm font-bold text-[var(--warning)]">关于一键出发</p><h1 className="app-hero-title mt-3 text-[var(--text-strong)]">跳过查攻略<br/><span className="text-[var(--brand-primary)]">把旅行直接安排好</span></h1><p className="mt-5 max-w-xl text-base leading-8 text-[var(--text-secondary)]">告诉我们目的地、天数和偏好，就能得到清楚可执行的每日路线，还可以把整趟旅行变成一组精美海报。</p><Link href="/#plan" className="btn-primary mt-8 w-full gap-3 px-7 py-3.5 sm:w-auto">开始安排旅行<AppIcon name="depart"/></Link></div>
      <AboutRouteIllustration className="w-full"/>
    </section>
    <section className="mt-14 grid gap-5 sm:grid-cols-3">{[["sparkles","少填一点","只问真正影响行程的选择。"],["route","每天清楚","到哪儿、怎么走，一眼就懂。"],["poster","值得分享","把确认好的路线做成旅行作品。"]].map(([icon,title,body],index)=><article key={title} className="app-card-secondary p-5"><span className={`icon-bubble ${index===0?"is-warm":index===2?"is-blue":""}`}><AppIcon name={icon as "sparkles"}/></span><h2 className="mt-4 text-lg font-semibold">{title}</h2><p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{body}</p></article>)}</section>
    <section className="mt-12 border-t border-[var(--border-soft)] pt-8"><p className="max-w-3xl text-sm leading-7 text-[var(--text-secondary)]">产品仍在测试和持续优化。行程由 AI 生成，营业时间、票价、交通、预约和天气等重要信息请在出发前再次确认。</p><div className="mt-5 flex flex-wrap gap-5 text-sm"><Link href="/privacy" className="btn-ghost">隐私政策</Link><Link href="/terms" className="btn-ghost">服务协议</Link>{email&&<a href={`mailto:${email}`} className="btn-ghost">联系我们</a>}</div></section>
  </main>;
}
