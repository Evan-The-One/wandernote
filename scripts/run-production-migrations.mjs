import {spawn} from "node:child_process";
import {Pool} from "@neondatabase/serverless";

if(process.env.VERCEL_ENV!=="production"){
  console.log("Skipping database migration outside Vercel Production.");
  process.exit(0);
}
if(!process.env.DATABASE_URL){
  console.error("DATABASE_URL is required for the production migration step.");
  process.exit(1);
}

const pool=new Pool({connectionString:process.env.DATABASE_URL});
const client=await pool.connect();
const lockKey=904_812_731;
try{
  await client.query("select pg_advisory_lock($1)",[lockKey]);
  const command=process.platform==="win32"?"pnpm.cmd":"pnpm";
  const status=await new Promise((resolve,reject)=>{const child=spawn(command,["db:migrate"],{stdio:"inherit",env:process.env});child.once("error",reject);child.once("exit",code=>resolve(code??1));});
  if(status!==0)process.exitCode=Number(status);
}finally{
  await client.query("select pg_advisory_unlock($1)",[lockKey]).catch(()=>undefined);
  client.release();
  await pool.end();
}
