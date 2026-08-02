import Taro from "@tarojs/taro";
const ACCESS="yjchufa-mini-access",REFRESH="yjchufa-mini-refresh";
export const getAccessToken=()=>Taro.getStorageSync<string>(ACCESS)||"";
export function saveSession(value:{sessionToken:string;refreshToken:string}){Taro.setStorageSync(ACCESS,value.sessionToken);Taro.setStorageSync(REFRESH,value.refreshToken)}
export function clearSession(){Taro.removeStorageSync(ACCESS);Taro.removeStorageSync(REFRESH)}
export async function ensureWechatLogin(){const login=await Taro.login();const result=await requestPublic<{sessionToken:string;refreshToken:string}>("/api/miniapp/auth/login",{method:"POST",data:{code:login.code,requestId:cryptoId()}});saveSession(result);return result}
export const cryptoId=()=>`${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
const origin=process.env.TARO_APP_API_ORIGIN||"https://www.yjchufa.com";
export async function requestPublic<T>(path:string,options:Partial<Taro.request.Option>={}){const response=await Taro.request({...options,url:`${origin}${path}`,header:{"content-type":"application/json",...options.header}});if(response.statusCode>=400)throw new Error((response.data as {error?:{message?:string}})?.error?.message||"网络请求失败");return response.data as T}
export async function request<T>(path:string,options:Partial<Taro.request.Option>={}){let token=getAccessToken();if(!token){await ensureWechatLogin();token=getAccessToken()}const response=await Taro.request({...options,url:`${origin}${path}`,header:{"content-type":"application/json",authorization:`Bearer ${token}`,...options.header}});if(response.statusCode===401){clearSession();throw new Error("登录状态已过期，请重新进入")};if(response.statusCode>=400)throw new Error((response.data as {error?:{message?:string}})?.error?.message||"请求失败，请稍后重试");return response.data as T}
export async function logout(){try{await request("/api/miniapp/auth/logout",{method:"POST",data:{}})}finally{clearSession()}}
