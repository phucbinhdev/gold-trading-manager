import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { useColorScheme } from 'react-native';

import { Colors } from '@/constants/theme';

export default function AppTabs() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'unspecified' ? 'light' : scheme];

  return (
    <NativeTabs
      backgroundColor={colors.background}
      indicatorColor={colors.backgroundElement}
      minimizeBehavior="onScrollDown"
      labelStyle={{ selected: { color: colors.text } }}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Vàng</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'chart.line.uptrend.xyaxis', selected: 'chart.line.uptrend.xyaxis' }} md="monitoring" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="rental">
        <NativeTabs.Trigger.Label>Tính nợ</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'house', selected: 'house.fill' }} md="home" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="savings">
        <NativeTabs.Trigger.Label>Tích góp</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'tray.full', selected: 'tray.full.fill' }} md="savings" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="ipad">
        <NativeTabs.Trigger.Label>iPad</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'ipad', selected: 'ipad' }} md="tablet_mac" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
