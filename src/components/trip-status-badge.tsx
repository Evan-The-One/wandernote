const labels: Record<string, string> = {
  completed: "已完成",
  incomplete: "未完成",
  generating: "生成中",
  failed: "生成失败",
};

export function TripStatusBadge({ status }: { status: string }) {
  const tone = status === "completed" ? "is-completed" : status === "generating" ? "is-generating" : status === "failed" ? "is-failed" : "is-incomplete";
  return <span className={`trip-status-badge ${tone}`}>{labels[status] || "未完成"}</span>;
}
