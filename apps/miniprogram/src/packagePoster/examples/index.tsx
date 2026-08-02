/* eslint-disable jsx-a11y/alt-text -- Taro Image does not expose the HTML alt prop. */
import{Image,ScrollView,View}from"@tarojs/components";
export default function Examples(){return <View className="page"><View className="title">旅行海报示例</View><ScrollView scrollY><Image mode="widthFix" style={{width:"100%"}} src="https://www.yjchufa.com/examples/shaoxing-travel-poster-example.jpg"/><View className="muted">示例仅供效果参考，实际内容会根据你的行程生成。</View></ScrollView></View>}
