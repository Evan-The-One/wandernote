import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { reviseDay } from "@/server/ai/day-revision";
import { assertAiRequestAllowed, assertRevisionModeLimit, recordAiUsage } from "@/server/ai/guard";
import { currentMiniappUser, readMiniappJson } from "@/server/auth/miniapp";
import { resolveGenerationAccess } from "@/server/auth/generation-access";
import { getDatabase } from "@/server/database/client";
import { trips } from "@/server/database/schema";
import { createRevisionJob, finishRevisionJob, replaceDayAndBudget, saveRevision } from "@/server/database/trips";
import { miniappVisitor } from "@/server/trips/miniapp-generation";
import { apiError, HttpError } from "@/server/http";
import type { DayPlan } from "@/types/trip";

export const runtime="nodejs"; export const maxDuration=120;
const schema=z.object({version:z.number().int().positive(),dayNumber:z.number().int().min(1).max(7),instruction:z.string().trim().min(2).max(500),mode:z.enum(["full_day","selected_activities"]).default("full_day"),selectedActivityIds:z.array(z.string().uuid()).max(8).default([])});
function adjacent(day:DayPlan|undefined){if(!day)return null;const first=day.activities[0],last=day.activities.at(-1);return{dayNumber:day.dayNumber,date:day.date,title:day.title,lastActivityEndTime:last?.endTime??null,lastActivityArea:last?.area??null,firstActivityStartTime:first?.startTime??null,firstActivityArea:first?.area??null}}

export async function POST(request:Request,{params}:{params:Promise<{tripId:string}>}){
  const started=performance.now();let jobId:string|null=null;
  try{
    const user=await currentMiniappUser(request),body=schema.parse(await readMiniappJson(request)),{tripId}=await params;
    const[row]=await getDatabase().select().from(trips).where(and(eq(trips.id,tripId),eq(trips.userId,user.id))).limit(1);
    if(!row)throw new HttpError(404,"没有找到这份行程","TRIP_NOT_FOUND");if(row.status!=="completed"||!row.currentPlanJson)throw new HttpError(409,"攻略尚未准备好","TRIP_NOT_READY");if(row.version!==body.version)throw new HttpError(409,"攻略已更新，请刷新后再试","VERSION_CONFLICT");
    const plan=row.currentPlanJson,index=plan.days.findIndex(day=>day.dayNumber===body.dayNumber),currentDay=plan.days[index];if(!currentDay)throw new HttpError(400,"目标日期不存在","DAY_NOT_FOUND");
    if(body.mode==="selected_activities"){const valid=new Set(currentDay.activities.map(a=>a.id));if(!body.selectedActivityIds.length||body.selectedActivityIds.some(id=>!valid.has(id)))throw new HttpError(400,"请选择这一天中需要修改的活动","INVALID_REVISION")}
    const visitorId=await miniappVisitor(user.id),access=await resolveGenerationAccess(user.id),limited=body.mode==="full_day"?access.enforceDailyWholeDayRevisionLimit:access.enforceDailyPartialRevisionLimit;if(limited)await assertRevisionModeLimit(visitorId,body.mode);const guard=await assertAiRequestAllowed(request,visitorId,body.mode==="full_day"?"day_revision":"partial_revision");jobId=await createRevisionJob(visitorId,tripId);
    const result=await reviseDay({schemaVersion:"0.2",originalInput:row.inputJson,strategy:plan.strategy,budget:plan.budget,targetDayNumber:currentDay.dayNumber,currentDay,previousDay:adjacent(plan.days[index-1]),nextDay:adjacent(plan.days[index+1]),otherDaysCostTotal:null,instruction:body.instruction,mode:body.mode,selectedActivityIds:body.selectedActivityIds},usage=>recordAiUsage(visitorId,tripId,jobId!,usage,true,access.mode),!guard.softBudgetReached);
    const updatedPlan=replaceDayAndBudget(plan,result.updatedDay);await saveRevision({tripId,visitorId:row.visitorId,expectedVersion:body.version,instruction:body.instruction,previousDay:currentDay,updatedDay:result.updatedDay,summary:result.changeSummary,updatedPlan,jobId,durationMs:Math.round(performance.now()-started)});
    return Response.json({plan:updatedPlan,version:body.version+1,changeSummary:result.changeSummary});
  }catch(error){if(jobId)await finishRevisionJob(jobId,error instanceof HttpError?error.code:"DAY_REVISION_FAILED",Math.round(performance.now()-started)).catch(()=>undefined);return apiError(error)}
}
