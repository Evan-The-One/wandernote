import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import { EmailLoginForm } from "@/features/auth/email-login-form";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ returnTo?: string }> }) {
  const { returnTo } = await searchParams;
  const safeReturn = returnTo?.startsWith("/trip/") ? returnTo : "/";
  return (
    <main className="min-h-screen bg-[#f7f5ee] px-5 py-12 text-[#183f31]">
      <div className="mx-auto max-w-md">
        <div className="flex justify-center"><BrandMark size="header" /></div>
        <section className="mt-8 rounded-3xl border border-[#dce3da] bg-white p-6 shadow-[0_18px_55px_rgba(36,91,70,0.08)] sm:p-8">
          <h1 className="text-2xl font-bold">邮箱登录</h1>
          <p className="mt-2 text-sm leading-6 text-[#65706a]">普通攻略仍可匿名使用。登录后可跨设备查看已认领的攻略，并使用账户海报权益。</p>
          <EmailLoginForm returnTo={safeReturn} />
        </section>
        <Link href={safeReturn} className="mx-auto mt-6 block w-fit text-sm font-semibold text-[#245b46]">返回攻略</Link>
      </div>
    </main>
  );
}
