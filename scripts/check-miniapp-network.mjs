const origin=(process.argv[2]||process.env.MINIAPP_API_ORIGIN||"https://www.yjchufa.com").replace(/\/$/,"");
if(!origin.startsWith("https://"))throw new Error("小程序域名必须使用 HTTPS");
async function check(path){const started=performance.now();const response=await fetch(`${origin}${path}`,{redirect:"manual",signal:AbortSignal.timeout(10_000)});return{path,status:response.status,redirect:response.headers.get("location")?true:false,durationMs:Math.round(performance.now()-started),host:new URL(response.url).host}}
const results=await Promise.all([check("/api/health"),check("/api/miniapp/public-config"),check("/examples/shaoxing-travel-poster-example.jpg")]);
console.log(JSON.stringify({origin,https:true,randomDeploymentDomain:/\.vercel\.app$/i.test(new URL(origin).host),results},null,2));
if(results.some(result=>result.status<200||result.status>=400||result.redirect))process.exitCode=1;
