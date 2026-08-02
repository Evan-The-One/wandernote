import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";

export default function AboutPage() {
  const email = process.env.PUBLIC_CONTACT_EMAIL;
  return <main className="page-shell py-12 sm:py-20"><article className="card relative mx-auto max-w-3xl overflow-hidden rounded-[var(--radius-feature)] p-7 text-center sm:p-12">
    <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-[var(--brand-lively)]/25 blur-3xl"/>
    <BrandMark align="center" />
    <h1 className="relative mt-8 text-3xl font-bold tracking-[-.035em] text-[var(--text-strong)] sm:text-4xl">关于一键出发</h1>
    <p className="relative mx-auto mt-7 max-w-xl text-xl font-semibold leading-9 text-[var(--brand-primary-deep)] sm:text-2xl">一键出发，帮你跳过查攻略，把旅行直接安排好。</p>
    <p className="relative mx-auto mt-4 max-w-xl leading-8 text-[var(--text-secondary)]">告诉我们目的地、天数和偏好，就能得到清晰可执行的每日路线，并可生成专属旅行海报。</p>
    <Link href="/#plan" className="btn-primary relative mx-auto mt-9 w-full max-w-sm gap-3 px-7 py-3.5">开始一键定制旅行<span className="text-[var(--accent-warm)]" aria-hidden="true">→</span></Link>
    <p className="relative mt-8 text-sm leading-7 text-[var(--text-secondary)]">产品仍在测试和持续优化。行程由 AI 生成，营业时间、票价、交通、预约和天气等重要信息请在出发前再次确认。</p>
    <div className="relative mt-6 flex flex-wrap justify-center gap-4 text-sm"><Link href="/privacy" className="btn-ghost underline">隐私政策</Link><Link href="/terms" className="btn-ghost underline">服务协议</Link>{email && <a href={`mailto:${email}`} className="btn-ghost underline">联系我们</a>}</div>
  </article></main>;
}
