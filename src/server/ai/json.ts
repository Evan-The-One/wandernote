export function parseJsonResponse(raw: string): unknown {
  const trimmed = raw.trim();
  try { return JSON.parse(trimmed); } catch {
    const withoutFence = trimmed.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
    try { return JSON.parse(withoutFence); } catch {
      const start = withoutFence.indexOf("{");
      const end = withoutFence.lastIndexOf("}");
      if (start >= 0 && end > start) return JSON.parse(withoutFence.slice(start, end + 1));
      throw new Error("模型没有返回可解析的 JSON");
    }
  }
}

type ResponsesPayload = { output_text?: string; output?: Array<{ content?: Array<{ type?: string; text?: string }> }> };

export function extractResponseText(payload: ResponsesPayload): string {
  if (payload.output_text) return payload.output_text;
  for (const item of payload.output ?? []) {
    for (const content of item.content ?? []) if (content.type === "output_text" && content.text) return content.text;
  }
  throw new Error("AI 响应中没有可用文本");
}
