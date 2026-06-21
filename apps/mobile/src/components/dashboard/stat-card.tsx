import { Text, View, useColorScheme } from 'react-native';

type StatCardProps = {
  label: string;
  value: string;
  tone?: 'gold' | 'green' | 'red' | 'blue' | 'neutral';
};

const toneColor = {
  gold: '#D97706',
  green: '#059669',
  red: '#DC2626',
  blue: '#2563EB',
  neutral: '#334155',
};

export function StatCard({ label, value, tone = 'neutral' }: StatCardProps) {
  const dark = useColorScheme() === 'dark';

  return (
    <View
      style={{
        flex: 1,
        minWidth: '46%',
        gap: 8,
        borderRadius: 18,
        borderCurve: 'continuous',
        backgroundColor: dark ? '#111827' : '#FFFFFF',
        padding: 16,
        boxShadow: dark ? undefined : '0 8px 24px rgba(15, 23, 42, 0.08)',
      }}>
      <Text selectable style={{ color: dark ? '#94A3B8' : '#64748B', fontSize: 13, fontWeight: '700' }}>
        {label}
      </Text>
      <Text
        selectable
        style={{
          color: toneColor[tone],
          fontSize: 22,
          fontWeight: '800',
          fontVariant: ['tabular-nums'],
        }}>
        {value}
      </Text>
    </View>
  );
}

export function StatGrid({ children }: { children: React.ReactNode }) {
  return <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>{children}</View>;
}
