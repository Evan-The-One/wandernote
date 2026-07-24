import {desc,eq} from "drizzle-orm";
import {z} from "zod";
import {currentUser} from "@/server/auth/user";
import {getDatabase} from "@/server/database/client";
import {pointLedger} from "@/server/database/schema";
import {apiError,HttpError} from "@/server/http";
const querySchema=z.object({page:z.coerce.number().int().min(1).max(10000).default(1),limit:z.coerce.number().int().min(1).max(30).default(15)});
const labels:Record<string,string>={signup_bonus:"新用户赠送",admin_grant:"管理员发放",poster_reserve:"海报生成预留",poster_consume:"生成旅行海报",poster_refund:"海报失败返还",purchase:"购买点数",adjustment:"点数调整"};
export async function GET(request:Request){try{const user=await currentUser();if(!user)throw new HttpError(401,"请先登录","LOGIN_REQUIRED");const query=querySchema.parse(Object.fromEntries(new URL(request.url).searchParams));const rows=await getDatabase().select({id:pointLedger.id,type:pointLedger.type,amount:pointLedger.amount,balanceAfter:pointLedger.balanceAfter,createdAt:pointLedger.createdAt}).from(pointLedger).where(eq(pointLedger.userId,user.id)).orderBy(desc(pointLedger.createdAt)).limit(query.limit+1).offset((query.page-1)*query.limit);return Response.json({items:rows.slice(0,query.limit).map(row=>({...row,label:labels[row.type]??"点数变动",createdAt:row.createdAt.toISOString()})),page:query.page,hasMore:rows.length>query.limit});}catch(error){return apiError(error);}}
