import { useCallback, useEffect, useState } from "react";
import Taro, { useRouter, useShareAppMessage } from "@tarojs/taro";
import { Button, Text, View } from "@tarojs/components";
import { Brand } from "../../components/brand";
import { cryptoId, request } from "../../services/session";
import type { MiniTrip } from "../../services/types";

type Share = { shareToken: string; path: string };

export default function Detail() {
  const id = String(useRouter().params.tripId || "");
  const [trip, setTrip] = useState<MiniTrip | null>(null);
  const [share, setShare] = useState<Share | null>(null);
  const [error, setError] = useState("");
  const load = useCallback(() => request<MiniTrip>(`/api/miniapp/trips/${id}`).then(setTrip), [id]);

  useEffect(() => { void load().catch((value: Error) => setError(value.message)); }, [load]);
  useShareAppMessage(() => ({
    title: trip ? `${trip.input.destination.city}${trip.input.days}天行程已经安排好了` : "一键出发旅行计划",
    path: share?.path || "/pages/start/index",
  }));

  async function enableShare() {
    try {
      const value = await request<Share>(`/api/miniapp/trips/${id}/share`, { method: "POST", data: {} });
      setShare(value);
      await Taro.showToast({ title: "分享已开启", icon: "success" });
    } catch (value) { setError(value instanceof Error ? value.message : "暂时无法分享"); }
  }
  async function revokeShare() {
    await request(`/api/miniapp/trips/${id}/share`, { method: "DELETE", data: {} });
    setShare(null);
    await Taro.showToast({ title: "分享已撤销", icon: "success" });
  }
  async function undo() {
    if (!trip) return;
    try {
      await request(`/api/miniapp/trips/${id}/undo`, { method: "POST", data: { version: trip.version } });
      await load();
      await Taro.showToast({ title: "已撤销最近修改", icon: "success" });
    } catch (value) { setError(value instanceof Error ? value.message : "暂时无法撤销"); }
  }
  async function replan() {
    if (!trip) return;
    const confirmed=await Taro.showModal({title:"重新安排整份行程",content:"会根据当前需求重新安排全部路线，原版本仍会保留。",confirmText:"重新安排"});
    if(!confirmed.confirm)return;
    try{
      const task=await request<{jobId:string}>(`/api/miniapp/trips/${id}/replan`,{method:"POST",header:{"idempotency-key":cryptoId()},data:{version:trip.version}});
      Taro.setStorageSync("yjchufa-active-job",task.jobId);
      await Taro.redirectTo({url:`/packageTrip/generating/index?jobId=${task.jobId}`});
    }catch(value){setError(value instanceof Error?value.message:"暂时无法重新安排")}
  }

  if (error) return <View className="page"><View className="error">{error}</View></View>;
  if (!trip?.plan) return <View className="page"><Text>正在读取行程…</Text></View>;
  const fallback = Array.isArray(trip.plan.planningRationale) ? trip.plan.planningRationale.join("\n") : trip.plan.planningRationale || trip.plan.summary;
  return <View className="page">
    <Brand />
    <View className="title" style={{ marginTop: "28rpx" }}>{trip.plan.title}</View>
    <View className="muted">{trip.input.destination.city} · {trip.input.days}天</View>
    <View className="card">
      <View className="section-title">为你考虑了什么</View>
      {trip.personalization?.length ? trip.personalization.map(paragraph => <View className="muted" key={paragraph.text} style={{ marginTop: "12rpx" }}>{paragraph.segments.map((segment, index) => <Text key={`${index}-${segment.text}`} style={segment.emphasized ? { fontWeight: 700, color: "#1f5e48" } : undefined}>{segment.text}</Text>)}</View>) : <View className="muted">{fallback}</View>}
    </View>
    <View className="card" onClick={() => Taro.navigateTo({ url: `/packagePoster/confirm/index?tripId=${id}&days=${trip.input.days}` })}>
      <View className="section-title">生成精美旅行海报</View><View className="muted">先看示例，再决定是否使用点数生成</View>
    </View>
    {trip.plan.days.map(day => <View className="card" key={day.dayNumber}>
      <Text className="section-title">DAY {day.dayNumber} · {day.theme}</Text>
      <View className="day">{day.activities.map(activity => <View className="activity" key={activity.id} onClick={() => Taro.navigateTo({ url: `/packageTrip/edit/index?tripId=${id}&day=${day.dayNumber}&version=${trip.version}&activityId=${activity.id}` })}>
        <View className="activity-time">{activity.startTime}–{activity.endTime}</View><View style={{ fontWeight: 700 }}>{activity.name}</View>
        {activity.area && <View className="muted">{activity.area}</View>}{activity.reason && <View className="muted">{activity.reason}</View>}
        {activity.transportToNext && <View className="muted">下一站：{activity.transportToNext.mode}{activity.transportToNext.durationMinutes ? `约${activity.transportToNext.durationMinutes}分钟` : ""}</View>}
        <View className="muted">点按可修改这个活动</View>
      </View>)}</View>
      <Button className="secondary" onClick={() => Taro.navigateTo({ url: `/packageTrip/edit/index?tripId=${id}&day=${day.dayNumber}&version=${trip.version}` })}>调整这一天</Button>
    </View>)}
    <Button className="secondary" onClick={replan}>重新安排整份行程</Button>
    <Button className="secondary" onClick={undo}>撤销最近修改</Button>
    <View className="card"><View className="section-title">出发前看一眼</View><View className="muted">行程由AI辅助生成，请结合天气、开放时间和现场情况确认。</View></View>
    {!share ? <Button className="primary" onClick={enableShare}>开启只读分享</Button> : <><Button className="primary" openType="share">分享给好友</Button><Button className="secondary" onClick={revokeShare}>撤销分享</Button></>}
  </View>;
}
