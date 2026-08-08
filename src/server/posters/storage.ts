import {del,head,issueSignedToken,presignUrl,put} from "@vercel/blob";
import {HttpError} from "@/server/http";

// Private poster storage is deliberately fail-closed. An ambient Vercel OIDC
// token alone does not identify a Blob store, so only an explicitly connected
// private Blob store (service token or store-scoped OIDC configuration) may
// enable paid poster generation.
export const posterStorageConfigured=()=>Boolean(process.env.BLOB_READ_WRITE_TOKEN||(process.env.VERCEL_OIDC_TOKEN&&process.env.BLOB_STORE_ID));

export async function storePrivatePoster(pathname:string,content:Buffer){
  if(!posterStorageConfigured())throw new HttpError(503,"海报存储尚未配置","POSTER_STORAGE_UNAVAILABLE");
  const result=await put(pathname,content,{access:"private",contentType:"image/jpeg",addRandomSuffix:false,allowOverwrite:true,cacheControlMaxAge:31_536_000});
  return{pathname:result.pathname};
}

export async function createPosterDownloadUrl(pathname:string,ttlMs=5*60_000){
  if(!posterStorageConfigured())throw new HttpError(503,"海报存储尚未配置","POSTER_STORAGE_UNAVAILABLE");
  const validUntil=Date.now()+ttlMs;
  const token=await issueSignedToken({pathname,operations:["get"],validUntil});
  const{presignedUrl}=await presignUrl(token,{operation:"get",pathname,validUntil,access:"private",useCache:true});
  return{url:presignedUrl,expiresAt:new Date(validUntil).toISOString()};
}

export async function getPosterMetadata(pathname:string){
  if(!posterStorageConfigured())throw new HttpError(503,"海报存储尚未配置","POSTER_STORAGE_UNAVAILABLE");
  const item=await head(pathname);
  return{pathname:item.pathname,size:item.size,contentType:item.contentType};
}

export async function deletePoster(pathname:string){
  if(!posterStorageConfigured())throw new HttpError(503,"海报存储尚未配置","POSTER_STORAGE_UNAVAILABLE");
  await del(pathname);
}

export async function posterStorageHealthCheck(){
  return{configured:posterStorageConfigured(),provider:"vercel_private_blob" as const};
}
