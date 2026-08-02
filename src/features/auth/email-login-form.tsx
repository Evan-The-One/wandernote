"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";

export function EmailLoginForm({ returnTo = "/" }: { returnTo?: string }) {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");
  const [accepted, setAccepted] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email || !accepted || sending) return;
    setSending(true);
    setMessage("");
    try {
      const response = await fetch("/api/auth/email/request", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, returnTo, legalAccepted: accepted }),
      });
      const payload = (await response.json()) as { message?: string };
      setMessage(payload.message || "如果邮箱可用，登录链接会很快发出。");
    } catch {
      setMessage("暂时无法发送，请稍后再试。");
    } finally {
      setSending(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-7">
      <label htmlFor="login-email" className="block text-sm font-semibold text-[var(--text-strong)]">邮箱</label>
      <input id="login-email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" className="focus-ring mt-2 min-h-12 w-full rounded-[var(--radius-control)] border border-[var(--border-soft)] bg-white px-4 py-3 outline-none" />
      <label className="mt-4 flex items-start gap-2 text-xs leading-5 text-[var(--text-secondary)]"><input type="checkbox" checked={accepted} onChange={event=>setAccepted(event.target.checked)} className="mt-1"/><span>我已阅读并同意 <Link className="underline" href="/terms">服务协议</Link> 和 <Link className="underline" href="/privacy">隐私政策</Link></span></label>
      <button type="submit" disabled={!email || !accepted || sending} className="btn-primary mt-4 w-full px-5 py-3 disabled:opacity-45">{sending ? "正在发送…" : "发送登录链接"}</button>
      {message && <p className="status-success mt-4 rounded-2xl p-4 text-sm leading-6" role="status">{message}</p>}
      <p className="mt-4 text-xs leading-5 text-[var(--text-muted)]">链接15分钟内有效且只能使用一次。若从攻略页发起登录，只会认领该次登录绑定的攻略。</p>
    </form>
  );
}
