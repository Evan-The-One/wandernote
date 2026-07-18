import { z } from "zod";
import { readJsonBody } from "@/server/http";
import { sendLoginLink } from "@/server/auth/user";

const schema=z.object({email:z.string().email().max(254),returnTo:z.string().max(200).default("/")});
export async function POST(request:Request){try{const parsed=schema.safeParse(await readJsonBody(request));if(parsed.success)await sendLoginLink(parsed.data.email,request,parsed.data.returnTo);}catch{/* identical response prevents account discovery */}return Response.json({message:"如果邮箱可用，登录链接会很快发出。"});}
