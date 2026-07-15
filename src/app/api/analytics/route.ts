import { z } from "zod";
import { ensureVisitor } from "@/server/auth/visitor";
import { recordAnalyticsEvent } from "@/server/database/analytics";

const eventSchema=z.object({eventName:z.enum(["page_view","page_duration","generate_clicked","share_clicked","day_image_saved","feedback_submitted","retry_clicked","network_error","user_aborted"]),tripId:z.string().uuid().nullable().optional(),pageName:z.enum(["home","generating","trip","other"]).nullable().optional(),durationMs:z.number().int().min(0).max(30*60*1000).nullable().optional(),status:z.string().max(30).nullable().optional(),metadata:z.record(z.string(),z.union([z.string().max(50),z.number(),z.boolean(),z.null()])).optional()});
export async function POST(request:Request){try{const body=eventSchema.safeParse(await request.json());if(!body.success)return new Response(null,{status:204});const{visitorId}=await ensureVisitor();await recordAnalyticsEvent({visitorId,...body.data});return new Response(null,{status:204});}catch{return new Response(null,{status:204});}}
