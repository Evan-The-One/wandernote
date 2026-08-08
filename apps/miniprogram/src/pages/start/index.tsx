import {useState} from "react";
import Taro from "@tarojs/taro";
import {Button,Input,Text,Textarea,View} from "@tarojs/components";
import {Brand} from "../../components/brand";
import {cryptoId,request} from "../../services/session";

const rhythms=["特种兵","慢慢逛","轻松玩"];
const focuses=["吃点好的","拍照出片","逛逛人文","欣赏风景"];

export default function Start(){
  const[step,setStep]=useState<1|2>(1),[destination,setDestination]=useState(""),[days,setDays]=useState("3"),[rhythm,setRhythm]=useState("慢慢逛"),[selected,setSelected]=useState<string[]>([]),[note,setNote]=useState(""),[extras,setExtras]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState("");
  const toggle=(value:string)=>setSelected(current=>current.includes(value)?current.filter(item=>item!==value):current.length<2?[...current,value]:current);
  async function submit(){
    if(!destination.trim()){setStep(1);setError("先告诉我想去哪里");return}
    setBusy(true);setError("");
    try{
      const job=await request<{jobId:string}>("/api/miniapp/trips/generate",{method:"POST",header:{"idempotency-key":cryptoId()},data:{destination:destination.trim(),days:Number(days),departureCity:"",transport:"混合交通",tags:[rhythm,...selected],note}});
      Taro.setStorageSync("yjchufa-active-job",job.jobId);
      await Taro.navigateTo({url:`/packageTrip/generating/index?jobId=${job.jobId}`});
    }catch(e){setError(e instanceof Error?e.message:"暂时没能开始生成")}finally{setBusy(false)}
  }
  return <View className={`page start-page step-${step}`}>
    <Brand/>
    {step===1&&<View className="start-copy"><Text className="title">不用查攻略{`\n`}告诉我去哪儿</Text><View className="muted">行程直接安排好</View></View>}
    <View className="step-head"><View><View className="step-count">{step} / 2</View><View className="muted">{step===1?"先定目的地和时间":"最后选节奏和重点"}</View></View></View>
    {step===1&&<><View className="card compact-card"><View className="section-title">去哪儿，玩几天？</View><Input className="input" value={destination} onInput={e=>setDestination(e.detail.value)} placeholder="例如：杭州"/><View className="chips inspiration">{["杭州","苏州","厦门","成都","广州","长沙"].map(city=><View key={city} className="chip" onClick={()=>setDestination(city)}>{city}</View>)}</View><View className="muted section-gap">玩几天？</View><View className="chips days">{[1,2,3,4,5,6,7].map(n=><View key={n} className={`chip ${days===String(n)?"chip-on":""}`} onClick={()=>setDays(String(n))}>{n}天</View>)}</View><Button className="primary" disabled={!destination.trim()} onClick={()=>setStep(2)}>继续选玩法</Button></View><View className="travel-illustration compact" aria-label="准备出发的山谷与公路"><View className="travel-sun"/><View className="travel-mountain"/><View className="travel-road"/><View className="travel-pin"/></View></>}
    {step===2&&<View className="card compact-card"><View className="section-title">想怎么玩？</View><View className="rhythm-grid">{rhythms.map((label,index)=><View key={label} className={`choice rhythm-${index+1} ${rhythm===label?"chip-on":""}`} onClick={()=>setRhythm(label)}><Text className="choice-icon"/><Text>{label}</Text>{rhythm===label&&<Text className="choice-check">✓</Text>}</View>)}</View><View className="muted section-gap">最多再选两个重点</View><View className="focus-grid">{focuses.map(item=><View key={item} className={`choice ${selected.includes(item)?"chip-on":""}`} onClick={()=>toggle(item)}>{item}{selected.includes(item)&&<Text className="choice-check">✓</Text>}</View>)}</View><Button className="secondary extras-trigger" onClick={()=>setExtras(true)}>补充更多需求（选填）</Button><Button className="ghost change-first" onClick={()=>setStep(1)}>← 返回上一步</Button></View>}
    {extras&&<View className="drawer-mask" onClick={()=>setExtras(false)}><View className="drawer" onClick={e=>e.stopPropagation()}><View className="section-title">补充更多需求</View><View className="muted">不填也可以直接生成</View><Textarea className="input textarea" value={note} maxlength={300} onInput={e=>setNote(e.detail.value)} placeholder="还有什么需要特别考虑？"/><Button className="primary" onClick={()=>setExtras(false)}>保存并返回</Button></View></View>}
    {error&&<View className="error">{error}</View>}
    {step===2&&<View className="sticky"><Button className="primary" loading={busy} disabled={busy} onClick={submit}>{busy?"正在准备…":"一键生成行程"}</Button></View>}
  </View>;
}
