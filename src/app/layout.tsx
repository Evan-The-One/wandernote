import type { Metadata } from "next";
import "./globals.css";
import { PageTracker } from "@/features/analytics/page-tracker";
import { AppShell } from "@/components/app-shell";
import { Suspense } from "react";

const configuredProductionUrl = process.env.NEXT_PUBLIC_APP_URL
  || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "https://wandernote-beryl.vercel.app");
const productionUrl = /^https?:\/\/[^\s]+$/i.test(configuredProductionUrl) ? configuredProductionUrl : "https://www.yjchufa.com";

export const metadata: Metadata = {
  metadataBase: new URL(productionUrl),
  title: { default: "一键出发 · AI 私人旅行管家", template: "%s · 一键出发" },
  description: "不用查攻略，一键直接出发。输入目的地、天数和玩法，生成可以直接照着走的旅行计划。",
  alternates: { canonical: "/" },
  openGraph: { title: "一键出发", description: "不用查攻略，一键直接出发。", type: "website", locale: "zh_CN", siteName: "一键出发", url: "/" },
  twitter: { card: "summary", title: "一键出发", description: "不用查攻略，一键直接出发。" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const contactEmail=process.env.PUBLIC_CONTACT_EMAIL;
  return (
    <html lang="zh-CN" data-scroll-behavior="smooth">
      <body>
        <PageTracker />
        <Suspense><AppShell contactEmail={contactEmail}>{children}</AppShell></Suspense>
      </body>
    </html>
  );
}
