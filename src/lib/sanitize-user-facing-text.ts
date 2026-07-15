const legacyLazy = `\u61d2\u4eba`;

export function sanitizeUserFacingText(value: string) {
  return value
    .replaceAll(`${legacyLazy}旅行`, "轻松玩")
    .replaceAll(`${legacyLazy}模式`, "轻松节奏")
    .replaceAll(`${legacyLazy}节奏`, "轻松节奏")
    .replaceAll(`适合${legacyLazy}的`, "节奏轻松的")
    .replaceAll(`适合${legacyLazy}`, "适合轻松游玩")
    .replaceAll(legacyLazy, "轻松游玩");
}

export function sanitizeUserFacingData<T>(value: T): T {
  if (typeof value === "string") return sanitizeUserFacingText(value) as T;
  if (Array.isArray(value)) return value.map(sanitizeUserFacingData) as T;
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        sanitizeUserFacingData(item),
      ]),
    ) as T;
  }
  return value;
}
