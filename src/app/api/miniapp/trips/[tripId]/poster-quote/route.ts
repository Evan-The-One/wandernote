import {and,eq} from "drizzle-orm";
import {currentMiniappUser} from "@/server/auth/miniapp";
import {getDatabase} from "@/server/database/client";
import {pointAccounts,posterPages,tripImageTasks,trips} from "@/server/database/schema";
import {quoteTravelPoster} from "@/server/database/trip-images";
import {apiError,HttpError} from "@/server/http";
import {posterStorageConfigured} from "@/server/posters/storage";

export async function GET(request:Request,{params}:{params:Promise<{tripId:string}>}){try{const user=await currentMiniappUser(request),{tripId}=await params,db=getDatabase();const[trip]=await db.select().from(trips).where(and(eq(trips.id,tripId),eq(trips.userId,user.id))).limit(1);if(!trip||!trip.currentPlanJson)throw new HttpError(404,"没有找到这份行程","TRIP_NOT_FOUND");const quote=quoteTravelPoster(trip.currentPlanJson,trip.inputJson),[account]=await db.select().from(pointAccounts).where(eq(pointAccounts.userId,user.id)).limit(1),[task]=await db.select({id:tripImageTasks.id,status:tripImageTasks.status,tripVersion:tripImageTasks.tripVersion}).from(tripImageTasks).where(and(eq(tripImageTasks.tripId,tripId),eq(tripImageTasks.tripVersion,trip.version),eq(tripImageTasks.imageType,"travel_poster"))).limit(1);const pages=task?await db.select({id:posterPages.id}).from(posterPages).where(eq(posterPages.posterTaskId,task.id)):[];return Response.json({...quote,quotedTripVersion:trip.version,availablePoints:account?.availablePoints??0,storageReady:posterStorageConfigured(),existingTask:task?{id:task.id,status:task.status,pageCount:pages.length,olderVersion:task.tripVersion!==trip.version}:null},{headers:{"cache-control":"no-store"}})}catch(error){return apiError(error)}}
