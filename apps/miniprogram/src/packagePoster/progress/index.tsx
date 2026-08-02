import Taro from"@tarojs/taro";import{Button,View}from"@tarojs/components";
export default function PosterProgress(){return <View className="page"><View className="title">正在把行程变成旅行海报</View><View className="card"><View className="muted">任务会在服务端继续，返回后不会重复扣点。</View></View><Button className="secondary" onClick={()=>Taro.navigateBack()}>返回攻略</Button></View>}
