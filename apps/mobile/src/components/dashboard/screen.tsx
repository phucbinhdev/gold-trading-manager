import { PropsWithChildren } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, Text, View, useColorScheme } from 'react-native';

type ScreenProps = PropsWithChildren<{
  title: string;
  subtitle: string;
  refreshing?: boolean;
  onRefresh?: () => void;
}>;

export function Screen({ title, subtitle, refreshing, onRefresh, children }: ScreenProps) {
  const scheme = useColorScheme();
  const dark = scheme === 'dark';

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: dark ? '#020617' : '#F8FAFC' }}
      contentInsetAdjustmentBehavior="automatic"
      refreshControl={
        onRefresh ? <RefreshControl refreshing={Boolean(refreshing)} onRefresh={onRefresh} /> : undefined
      }
      contentContainerStyle={{
        gap: 16,
        paddingHorizontal: 18,
        paddingTop: 24,
        paddingBottom: 128,
      }}>
      <View style={{ gap: 6 }}>
        <Text selectable style={{ color: dark ? '#F8FAFC' : '#0F172A', fontSize: 34, fontWeight: '800' }}>
          {title}
        </Text>
        <Text selectable style={{ color: dark ? '#CBD5E1' : '#64748B', fontSize: 16, lineHeight: 22 }}>
          {subtitle}
        </Text>
      </View>
      {children}
    </ScrollView>
  );
}

export function LoadingState() {
  return (
    <View style={{ paddingVertical: 40, alignItems: 'center' }}>
      <ActivityIndicator />
    </View>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <View style={{ borderRadius: 18, padding: 20, backgroundColor: '#FFFFFF' }}>
      <Text selectable style={{ color: '#64748B', fontWeight: '700' }}>
        {message}
      </Text>
    </View>
  );
}
