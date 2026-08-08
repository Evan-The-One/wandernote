import {Image,View,Text} from "@tarojs/components";
import brandIcon from "../assets/brand/icon-192.png";
export function Brand(){return <View className="brand-wrap"><Image className="brand-icon" src={brandIcon} mode="aspectFit" aria-label="一键出发品牌图标"/><View className="brand-copy"><Text className="brand">一键出发</Text><View className="brand-sub">ONE-CLICK</View></View></View>}
