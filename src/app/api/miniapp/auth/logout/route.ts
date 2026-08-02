import { apiError } from "@/server/http"; import { revokeMiniappSession } from "@/server/auth/miniapp";
export async function POST(request: Request) { try { await revokeMiniappSession(request); return Response.json({ ok: true }, { headers: { "cache-control": "no-store" } }); } catch (error) { return apiError(error); } }
