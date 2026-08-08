import assert from "node:assert/strict";
import {planPosterLayout,validatePosterCompleteness,type LayoutDay} from "../src/server/posters/layout";

const day=(dayNumber:number,count:number,long=false):LayoutDay=>({dayNumber,date:null,title:`第${dayNumber}天路线`,city:"苏州",tips:["提前核实开放时间"],activities:Array.from({length:count},(_,index)=>({id:`d${dayNumber}-a${index+1}`,time:`${String(8+index).padStart(2,"0")}:00`,name:long?`第${index+1}个需要完整展示的超长活动地点名称`: `活动${index+1}`,note:long?"这是一段用于验证动态测量、自动换行与分页边界的较长活动说明，任何内容都不能被截断。":"简短可执行说明"}))});
const verify=(days:LayoutDay[],expectedPages:number)=>{const plan=planPosterLayout(days),audit=validatePosterCompleteness(plan);assert.equal(plan.pageCount,expectedPages);assert.equal(audit.valid,true,JSON.stringify(audit));assert.equal(audit.expectedActivityCount,days.reduce((sum,item)=>sum+item.activities.length,0));assert.equal(audit.renderedActivityCount,audit.expectedActivityCount);assert.equal(new Set(plan.renderedActivityIds).size,plan.renderedActivityIds.length);assert.equal(plan.layoutPlanHash,planPosterLayout(days).layoutPlanHash);return plan;};

verify([day(1,4),day(2,5)],1);
verify([day(1,8),day(2,4)],2);
const dense=verify([day(1,10)],1);assert.equal(dense.pages[0]?.layoutMode,"dense");assert.equal(dense.pages[0]?.days.length,2);
verify([day(1,4),day(2,4),day(3,4)],2);
verify(Array.from({length:7},(_,index)=>day(index+1,4)),4);
verify([day(1,7,true),day(2,7,true)],2);
const continuation=verify([day(1,20,true)],2);assert.equal(continuation.pages[1]?.layoutMode,"continuation");
console.log("poster dynamic layout contracts passed");
