import { trackEvent } from "@/features/analytics/client";

export async function logoutCurrentAccount() {
  trackEvent("logout_clicked", { pageName: "account" });
  const response = await fetch("/api/auth/session", { method: "DELETE", cache: "no-store" });
  if (!response.ok) {
    trackEvent("logout_failed", { pageName: "account" });
    throw new Error("退出失败，请稍后重试");
  }
  try {
    localStorage.removeItem("yjchufa:auth-completed");
    localStorage.setItem("yjchufa:auth-state", JSON.stringify({ type: "logout_completed", at: Date.now() }));
    sessionStorage.removeItem("yjchufa:pending-action");
    sessionStorage.removeItem("yjchufa:pending-home-action");
  } catch { /* storage can be unavailable */ }
  try {
    const channel = new BroadcastChannel("yjchufa-auth");
    channel.postMessage({ type: "logout_completed", at: Date.now() });
    channel.close();
  } catch { /* unsupported */ }
  window.dispatchEvent(new CustomEvent("yjchufa-auth-changed", { detail: { authenticated: false } }));
  trackEvent("logout_succeeded", { pageName: "account" });
}
