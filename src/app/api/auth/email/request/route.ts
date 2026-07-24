import { z } from "zod";
import { readJsonBody } from "@/server/http";
import { sendLoginLink } from "@/server/auth/user";

const schema=z.object({email:z.string().email().max(254),returnTo:z.string().max(200).default("/"),tripId:z.string().uuid().optional(),pendingAction:z.enum(["generate_poster"]).optional(),legalAccepted:z.literal(true)});
export async function POST(request:Request){let attempt:null|Awaited<ReturnType<typeof sendLoginLink>>=null;try{const parsed=schema.safeParse(await readJsonBody(request));if(parsed.success)attempt=await sendLoginLink(parsed.data.email,request,parsed.data);}catch{/* identical message prevents account discovery */}return Response.json({message:"如果邮箱可用，登录链接会很快发出。",attemptId:attempt?.attemptId??null,expiresAt:attempt?.expiresAt??null,pendingAction:attempt?.pendingAction??null});}
