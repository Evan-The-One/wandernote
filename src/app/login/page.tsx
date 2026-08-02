import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import { EmailLoginForm } from "@/features/auth/email-login-form";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ returnTo?: string }> }) {
  const { returnTo } = await searchParams;
  const safeReturn = returnTo?.startsWith("/trip/") || returnTo === "/account" ? returnTo : "/";
  return (
    <main className="min-h-screen bg-transparent px-5 py-12 text-[var(--text-primary)] sm:py-16">
      <div className="mx-auto max-w-md">
        <div className="flex justify-center"><BrandMark size="header" /></div>
        <section className="card mt-8 rounded-[var(--radius-feature)] p-6 sm:p-8">
          <span className="inline-flex rounded-full bg-[var(--background-soft)] px-3 py-1 text-xs font-semibold text-[var(--brand-primary)]">在不同设备继续旅行</span>
          <h1 className="mt-4 text-3xl font-bold tracking-[-.03em] text-[var(--text-strong)]">邮箱登录</h1>
          <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">普通攻略仍可匿名使用。登录后可以保存历史行程、查看点数，并继续生成旅行海报。</p>
          <EmailLoginForm returnTo={safeReturn} />
        </section>
        <Link href={safeReturn} className="btn-ghost mx-auto mt-6 block w-fit text-sm">返回攻略</Link>
      </div>
    </main>
  );
}
