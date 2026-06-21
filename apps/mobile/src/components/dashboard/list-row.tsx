import { Text, TouchableOpacity, View, useColorScheme } from 'react-native';

type ListRowProps = {
  title: string;
  subtitle?: string;
  value?: string;
  valueTone?: 'default' | 'positive' | 'negative';
  onPress?: () => void;
};

export function ListRow({ title, subtitle, value, valueTone = 'default', onPress }: ListRowProps) {
  const dark = useColorScheme() === 'dark';
  const valueColor =
    valueTone === 'positive' ? '#059669' : valueTone === 'negative' ? '#DC2626' : dark ? '#F8FAFC' : '#0F172A';

  const Container = onPress ? TouchableOpacity : View;

  return (
    <Container
      onPress={onPress}
      activeOpacity={0.7}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: dark ? '#1F2937' : '#E5E7EB',
      }}>
      <View style={{ flex: 1, gap: 3 }}>
        <Text selectable numberOfLines={1} style={{ color: dark ? '#F8FAFC' : '#111827', fontWeight: '800' }}>
          {title}
        </Text>
        {subtitle ? (
          <Text selectable numberOfLines={1} style={{ color: dark ? '#94A3B8' : '#64748B', fontSize: 13 }}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {value ? (
        <Text selectable style={{ color: valueColor, fontWeight: '800', fontVariant: ['tabular-nums'] }}>
          {value}
        </Text>
      ) : null}
      {onPress ? (
        <Text style={{ color: '#2563EB', fontSize: 12, fontWeight: '700' }}>›</Text>
      ) : null}
    </Container>
  );
}

export function ListPanel({ title, children }: { title: string; children: React.ReactNode }) {
  const dark = useColorScheme() === 'dark';

  return (
    <View
      style={{
        borderRadius: 18,
        borderCurve: 'continuous',
        backgroundColor: dark ? '#111827' : '#FFFFFF',
        paddingHorizontal: 16,
        paddingTop: 16,
        boxShadow: dark ? undefined : '0 8px 24px rgba(15, 23, 42, 0.08)',
      }}>
      <Text selectable style={{ color: dark ? '#F8FAFC' : '#0F172A', fontSize: 18, fontWeight: '800' }}>
        {title}
      </Text>
      <View style={{ marginTop: 4 }}>{children}</View>
    </View>
  );
}
