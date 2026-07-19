import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";

export default function AboutPage() {
  const email = process.env.PUBLIC_CONTACT_EMAIL;
  return <main className="page-shell py-12 sm:py-16"><article className="card mx-auto max-w-3xl rounded-3xl p-6 text-center sm:p-10">
    <BrandMark align="center" />
    <h1 className="mt-7 text-3xl font-bold">关于一键出发</h1>
    <p className="mx-auto mt-7 max-w-xl text-xl font-bold leading-9 text-[#204f3c]">一键出发，帮你跳过查攻略，把旅行直接安排好。</p>
    <p className="mx-auto mt-4 max-w-xl leading-8 text-[#65706a]">告诉我们目的地、天数和偏好，系统会生成清晰可执行的每日路线，并可进一步生成精美旅行海报。</p>
    <Link href="/#plan" className="mx-auto mt-8 inline-flex min-h-12 w-full max-w-sm items-center justify-center rounded-full bg-[#245b46] px-7 py-3 font-bold text-white shadow-[0_12px_28px_rgba(36,91,70,.18)]">开始一键定制旅行</Link>
    <p className="mt-8 text-sm leading-7 text-[#65706a]">产品仍在测试和持续优化。行程由 AI 生成，营业时间、票价、交通、预约和天气等重要信息请在出发前再次确认。</p>
    <div className="mt-6 flex flex-wrap justify-center gap-4 text-sm"><Link href="/privacy" className="underline">隐私政策</Link><Link href="/terms" className="underline">服务协议</Link>{email && <a href={`mailto:${email}`} className="text-[#245b46] underline">联系我们</a>}</div>
  </article></main>;
}
