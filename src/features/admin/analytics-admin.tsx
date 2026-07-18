"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";

type Data = {
  metrics: Record<string, number>;
  failures: { label: string; value: number; ratio: number }[];
  styleStats: {style:string;total:number;successRate:number;failureRate:number;revisionRate:number;averageDurationMs:number}[];
  devices: [string, number][];
  trend: {
    days: number;
    total: number;
    success: number;
    successRate: number;
  }[];
  records: {
    id: string;
    createdAt: string;
    tripId: string | null;
    destination: string;
    days: number;
    style: string;
    companion: string;
    status: string;
    duration: number | null;
    error: string | null;
  }[];
};

const labels: Record<string, string> = {
  pageViews: "页面访问",
  visitors: "匿名访客",
  averageHomeDurationMs: "首页平均停留",
  generateClicks: "生成点击",
  conversionRate: "首页生成转化",
  generated: "生成请求",
  success: "生成成功",
  failed: "生成失败",
  successRate: "生成成功率",
  failureRate: "生成失败率",
  averageDurationMs: "平均生成耗时",
  p50Ms: "P50耗时",
  p90Ms: "P90耗时",
  revisions: "单日修改",
  revisionSuccessRate: "修改成功率",
  shares: "分享点击",
  images: "图片保存",
  feedback: "反馈提交",
  todayAiRequests:"今日AI请求",todayAiCostUsd:"今日估算成本",fullGenerationCostUsd:"完整生成成本",dayRevisionCostUsd:"整天修改成本",partialRevisionCostUsd:"局部修改成本",repairCostUsd:"自动修复成本",rateLimited:"限流拦截",idempotentReused:"幂等复用",
  premiumImageTasks:"今日精美图片任务",premiumImageSuccess:"图片成功",premiumImageFailed:"图片失败",premiumImageAverageDurationMs:"图片平均耗时",premiumImageCostUsd:"图片总成本",premiumImageFreeCreditsUsed:"免费图片额度使用",premiumImageSaved:"图片保存",premiumImageShared:"图片分享",
};
const display: Record<string, string> = {
  fast_paced: "特种兵",
  slow: "慢慢逛",
  lazy: "轻松玩",
  food: "美食探索",
  romantic: "情侣旅行",
  family: "亲子旅行",
  solo: "独自出行",
  undecided:"还没确定",partner:"对象",other:"其他",couple:"对象",parents:"其他",extended_family:"其他",
  friends: "朋友",
  family_with_children: "亲子",
  family_adults: "家人",
  completed: "成功",
  failed: "失败",
  running: "生成中",
  mobile: "手机",
  tablet: "平板",
  desktop: "电脑",
  unknown: "未知",
};

export function AnalyticsAdmin({
  authorized,
  configured,
}: {
  authorized: boolean;
  configured: boolean;
}) {
  const [logged, setLogged] = useState(authorized);
  const [code, setCode] = useState("");
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    if (logged)
      fetch("/api/admin/analytics")
        .then((response) => (response.ok ? response.json() : Promise.reject()))
        .then(setData)
        .catch(() => setError("数据加载失败"));
  }, [logged]);
  async function login(event: FormEvent) {
    event.preventDefault();
    const response = await fetch("/api/admin/auth", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ code }),
    });
    if (response.ok) setLogged(true);
    else setError("访问码不正确");
  }
  async function logout() {
    await fetch("/api/admin/auth", { method: "DELETE" });
    setLogged(false);
    setData(null);
  }
  if (!configured)
    return (
      <main className="page-shell py-20">
        <h1 className="text-2xl font-bold">数据后台尚未启用</h1>
        <p className="mt-3">请先配置 ADMIN_ACCESS_CODE。</p>
      </main>
    );
  if (!logged)
    return (
      <main className="page-shell py-20">
        <form
          onSubmit={login}
          className="card mx-auto max-w-md rounded-3xl p-8"
        >
          <h1 className="text-2xl font-bold">管理员登录</h1>
          <input
            aria-label="管理员访问码"
            type="password"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            className="mt-5 w-full rounded-xl border p-3"
          />
          <button className="mt-4 w-full rounded-full bg-[#245b46] p-3 font-bold text-white">
            进入后台
          </button>
          {error && <p className="mt-3 text-red-700">{error}</p>}
        </form>
      </main>
    );
  return (
    <main className="page-shell py-10">
      <nav className="flex flex-wrap gap-3 text-sm font-bold">
        <Link
          href="/admin/analytics"
          className="rounded-full bg-[#245b46] px-4 py-2 text-white"
        >
          数据概览
        </Link>
        <Link href="/admin/feedback" className="rounded-full border px-4 py-2">
          用户反馈
        </Link>
        <button
          onClick={logout}
          className="ml-auto rounded-full border px-4 py-2"
        >
          退出
        </button>
      </nav>
      <h1 className="mt-8 text-3xl font-bold">产品与生成稳定性</h1>
      <p className="mt-2 text-sm text-[#707a74]">
        近30天数据，埋点只记录白名单字段。
      </p>
      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        {data &&
          Object.entries(data.metrics).map(([key, value]) => (
            <div key={key} className="card rounded-2xl p-4">
              <p className="text-xs text-[#707a74]">{labels[key] || key}</p>
              <strong className="mt-1 block text-xl">
                {key.includes("CostUsd") ? `$${value.toFixed(4)}` : key.includes("Rate")
                  ? `${(value * 100).toFixed(1)}%`
                  : key.includes("Ms")
                    ? `${Math.round(value / 1000)}秒`
                    : value}
              </strong>
            </div>
          ))}
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <section className="card rounded-3xl p-6">
          <h2 className="font-bold">失败分类</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {data?.failures.map((item) => (
              <span
                key={item.label}
                className="rounded-full bg-[#fff1e6] px-3 py-2 text-sm"
              >
                {item.label} · {item.value}（{(item.ratio * 100).toFixed(1)}%）
              </span>
            ))}
          </div>
          {data?.failures.length === 0 && (
            <p className="mt-3 text-sm text-[#707a74]">近30天没有失败记录</p>
          )}
        </section>
        <section className="card rounded-3xl p-6">
          <h2 className="font-bold">趋势与设备</h2>
          <div className="mt-3 space-y-2 text-sm">
            {data?.trend.map((item) => (
              <p key={item.days}>
                近{item.days === 1 ? "24小时" : `${item.days}天`}：{item.total}
                次，成功率 {(item.successRate * 100).toFixed(1)}%
              </p>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {data?.devices.map(([name, value]) => (
              <span
                key={name}
                className="rounded-full bg-[#edf5ef] px-3 py-2 text-sm"
              >
                {display[name] || "其他"} · {value}
              </span>
            ))}
          </div>
        </section>
      </div>
      <section className="card mt-6 rounded-3xl p-6"><h2 className="font-bold">旅行节奏表现</h2><div className="mt-4 overflow-x-auto"><table className="w-full min-w-[650px] text-sm"><thead><tr>{["节奏","使用次数","成功率","失败率","修改率","平均耗时"].map(item=><th key={item} className="p-2 text-left">{item}</th>)}</tr></thead><tbody>{data?.styleStats.map(item=><tr key={item.style} className="border-t"><td className="p-2 font-bold">{display[item.style]||item.style}</td><td>{item.total}</td><td>{(item.successRate*100).toFixed(1)}%</td><td>{(item.failureRate*100).toFixed(1)}%</td><td>{(item.revisionRate*100).toFixed(1)}%</td><td>{Math.round(item.averageDurationMs/1000)}秒</td></tr>)}</tbody></table></div></section>
      <div className="mt-6 overflow-x-auto rounded-2xl bg-white">
        <table className="w-full min-w-[850px] text-sm">
          <thead>
            <tr>
              {[
                "时间",
                "目的地",
                "天数",
                "节奏",
                "同行",
                "状态",
                "耗时",
                "失败原因",
                "攻略",
              ].map((value) => (
                <th key={value} className="p-3 text-left">
                  {value}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data?.records.map((row) => (
              <tr key={row.id} className="border-t">
                <td className="p-3">
                  {new Date(row.createdAt).toLocaleString("zh-CN")}
                </td>
                <td>{row.destination}</td>
                <td>{row.days}</td>
                <td>{display[row.style] || "其他"}</td>
                <td>{display[row.companion] || "其他"}</td>
                <td>{display[row.status] || "未知"}</td>
                <td>
                  {row.duration ? `${Math.round(row.duration / 1000)}秒` : "—"}
                </td>
                <td>{row.error || "—"}</td>
                <td>
                  {row.tripId ? (
                    <a href={`/trip/${row.tripId}`} className="text-[#245b46]">
                      查看
                    </a>
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
