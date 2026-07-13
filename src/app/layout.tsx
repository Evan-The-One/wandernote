import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "漫游册 · AI 私人旅行管家",
  description: "输入简单偏好，生成真正适合你的私人旅行攻略。",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>
        <header className="border-b border-black/5 bg-[#f7f8f3]/90 backdrop-blur">
          <div className="page-shell flex h-16 items-center justify-between">
            <Link href="/" className="focus-ring rounded-lg text-lg font-bold tracking-tight">
              漫游册 <span className="text-[#e0933d]">WanderNote</span>
            </Link>
            <Link href="/create" className="focus-ring rounded-full bg-[#245b46] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1d4938]">
              开始规划
            </Link>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
