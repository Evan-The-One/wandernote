import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import { EmailLoginForm } from "@/features/auth/email-login-form";
import {LoginIllustration} from "@/components/travel-illustrations";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ returnTo?: string }> }) {
  const { returnTo } = await searchParams;
  const safeReturn = returnTo?.startsWith("/trip/") || returnTo === "/account" ? returnTo : "/";
  return (
    <main className="app-container grid min-h-[calc(100vh-72px)] items-center gap-8 py-8 text-[var(--text-primary)] lg:grid-cols-2 lg:gap-16 lg:py-16">
      <section className="px-1">
        <div className="lg:hidden"><BrandMark size="header" /></div>
        <LoginIllustration className="login-illustration mt-2 w-full lg:mt-0"/>
        <h1 className="app-hero-title mt-2 text-[var(--text-strong)]">回来继续<br/><span className="text-[var(--brand-primary)]">你的下一段旅行</span></h1>
        <p className="mt-2 max-w-md text-sm leading-6 text-[var(--text-secondary)] sm:mt-4 sm:text-base sm:leading-7">登录后，你的行程、点数和海报都会保存下来。</p>
      </section>
      <div className="lg:max-w-md">
        <section className="app-card-primary p-4 sm:p-8">
          <span className="inline-flex rounded-full bg-[var(--background-soft)] px-3 py-1 text-xs font-semibold text-[var(--brand-primary)]">在不同设备继续旅行</span>
          <h2 className="mt-4 text-2xl font-bold tracking-[-.03em] text-[var(--text-strong)]">邮箱登录</h2>
          <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">无需密码，我们会发送一封安全登录邮件。</p>
          <EmailLoginForm returnTo={safeReturn} />
        </section>
        <Link href={safeReturn} className="btn-ghost mx-auto mt-6 block w-fit text-sm">暂不登录，返回旅行</Link>
      </div>
    </main>
  );
}
