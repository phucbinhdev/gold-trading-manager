import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Platform, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';

import { ListPanel, ListRow } from '@/components/dashboard/list-row';
import { EmptyState, LoadingState, Screen } from '@/components/dashboard/screen';
import { StatCard, StatGrid } from '@/components/dashboard/stat-card';
import { NativeActionButton } from '@/components/native/native-action-button';
import { NativeSegmentedPicker } from '@/components/native/native-segmented-picker';
import { formatCurrency, formatNumber } from '@/lib/format/currency';
import { hasSupabaseEnv } from '@/lib/supabase/client';
import {
  getBudgetDashboard,
  getGoldDashboard,
  getIpadDashboard,
  getRentalDashboard,
  getSavingsDashboard,
} from '@/lib/supabase/queries';

type Feature = 'gold' | 'budget' | 'rental' | 'savings' | 'ipad' | 'settings';

const featureMeta = {
  gold: {
    title: 'Quản Lý Vàng',
    subtitle: 'Danh mục vàng, giá thị trường và lợi nhuận tạm tính.',
  },
  budget: {
    title: 'Budget',
    subtitle: 'Tổng quan tháng ngân sách mới nhất từ Supabase.',
  },
  rental: {
    title: 'Tiền trọ',
    subtitle: 'Cấu hình phòng trọ, phí đang bật và hóa đơn gần nhất.',
  },
  savings: {
    title: 'Tích góp',
    subtitle: 'Theo dõi các dây tích góp và số ô đã đóng.',
  },
  ipad: {
    title: 'iPad',
    subtitle: 'Hàng đang nhập/kho, máy đã bán và lợi nhuận đã chốt.',
  },
  settings: {
    title: 'Cài đặt',
    subtitle: 'Thông tin cấu hình native app và Supabase.',
  },
} satisfies Record<Feature, { title: string; subtitle: string }>;

export function DashboardScreen({ feature }: { feature: Feature }) {
  const meta = featureMeta[feature];

  return (
    <Screen title={meta.title} subtitle={meta.subtitle}>
      {feature === 'gold' && <GoldPanel />}
      {feature === 'budget' && <BudgetPanel />}
      {feature === 'rental' && <RentalPanel />}
      {feature === 'savings' && <SavingsPanel />}
      {feature === 'ipad' && <IpadPanel />}
      {feature === 'settings' && <SettingsPanel />}
    </Screen>
  );
}

function GoldPanel() {
  const query = useQuery({ queryKey: ['mobile', 'gold'], queryFn: getGoldDashboard });

  if (query.isLoading) return <LoadingState />;
  if (query.error || !query.data) return <EmptyState message="Không tải được dữ liệu vàng." />;

  const data = query.data;
  const profitTone = data.profit >= 0 ? 'green' : 'red';

  return (
    <>
      <NativeActionButton
        label="Thêm giao dịch"
        systemImage="plus"
        prominent
        onPress={() => {
          if (Platform.OS === 'ios') {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }
          router.push('/gold-add');
        }}
      />
      <StatGrid>
        <StatCard label="Tổng chỉ" value={formatNumber(data.totalChi, ' chỉ')} tone="gold" />
        <StatCard label="Giá hiện tại" value={formatCurrency(data.marketPrice)} tone="gold" />
        <StatCard label="Vốn" value={formatCurrency(data.totalInvested)} />
        <StatCard label="Lãi/lỗ" value={formatCurrency(data.profit)} tone={profitTone} />
      </StatGrid>
      <ListPanel title="Giao dịch gần đây">
        {data.transactions.map((row) => (
          <ListRow
            key={row.id}
            title={`${formatNumber(row.amount_chi, ' chỉ')} - ${row.transaction_date}`}
            subtitle={row.note ?? 'Không có ghi chú'}
            value={formatCurrency(row.total_price ?? row.amount_chi * row.price_per_chi)}
          />
        ))}
      </ListPanel>
    </>
  );
}

function BudgetPanel() {
  const query = useQuery({ queryKey: ['mobile', 'budget'], queryFn: getBudgetDashboard });
  const [mode, setMode] = useState<'all' | 'paid' | 'unpaid'>('all');

  if (query.isLoading) return <LoadingState />;
  if (query.error || !query.data) return <EmptyState message="Không tải được dữ liệu budget." />;
  if (!query.data.month) return <EmptyState message="Chưa có tháng budget." />;

  const expenses = query.data.expenses.filter((row) => {
    if (mode === 'paid') return row.is_paid;
    if (mode === 'unpaid') return !row.is_paid;
    return true;
  });

  return (
    <>
      <NativeActionButton
        label="Thêm khoản"
        systemImage="plus"
        prominent
        onPress={() => {
          if (Platform.OS === 'ios') {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }
          router.push('/budget-add');
        }}
      />
      <NativeSegmentedPicker
        value={mode}
        onChange={setMode}
        options={[
          { label: 'Tất cả', value: 'all' },
          { label: 'Đã trả', value: 'paid' },
          { label: 'Chưa', value: 'unpaid' },
        ]}
      />
      <StatGrid>
        <StatCard label="Tháng" value={query.data.month.month_key} tone="blue" />
        <StatCard label="Thu nhập" value={formatCurrency(query.data.month.total_income)} />
        <StatCard label="Đã chọn" value={formatCurrency(query.data.totalSelected)} tone="red" />
        <StatCard label="Còn lại" value={formatCurrency(query.data.remaining)} tone="green" />
      </StatGrid>
      <ListPanel title="Khoản budget">
        {expenses.map((row) => (
          <ListRow
            key={row.id}
            title={row.name}
            subtitle={row.note ?? (row.is_paid ? 'Đã trả' : 'Chưa trả')}
            value={formatCurrency(row.amount)}
            valueTone={row.is_paid ? 'positive' : 'default'}
          />
        ))}
      </ListPanel>
    </>
  );
}

function RentalPanel() {
  const query = useQuery({ queryKey: ['mobile', 'rental'], queryFn: getRentalDashboard });

  if (query.isLoading) return <LoadingState />;
  if (query.error || !query.data) return <EmptyState message="Không tải được dữ liệu tiền trọ." />;

  return (
    <>
      <NativeActionButton
        label="Tính hóa đơn"
        systemImage="doc.text.magnifyingglass"
        prominent
        onPress={() => {
          if (Platform.OS === 'ios') {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }
          router.push('/rental-add');
        }}
      />
      <StatGrid>
        <StatCard label="Tiền phòng" value={formatCurrency(query.data.settings?.rent_price)} tone="blue" />
        <StatCard label="Điện" value={formatCurrency(query.data.settings?.electric_price)} />
        <StatCard label="Nước" value={formatCurrency(query.data.settings?.water_price)} />
        <StatCard label="Phí đang bật" value={`${query.data.activeFees.length}`} tone="gold" />
      </StatGrid>
      {query.data.latestRecord ? (
        <ListPanel title="Hóa đơn gần nhất">
          <ListRow
            title={query.data.latestRecord.month}
            subtitle="Tổng tiền"
            value={formatCurrency(query.data.latestRecord.total_amount)}
          />
          <ListRow title="Điện" value={formatCurrency(query.data.latestRecord.electric_amount)} />
          <ListRow title="Nước" value={formatCurrency(query.data.latestRecord.water_amount)} />
        </ListPanel>
      ) : (
        <EmptyState message="Chưa có hóa đơn." />
      )}
    </>
  );
}

function SavingsPanel() {
  const query = useQuery({ queryKey: ['mobile', 'savings'], queryFn: getSavingsDashboard });

  if (query.isLoading) return <LoadingState />;
  if (query.error || !query.data) return <EmptyState message="Không tải được dữ liệu tích góp." />;

  return (
    <>
      <NativeActionButton
        label="Thêm dây tích góp"
        systemImage="plus"
        prominent
        onPress={() => {
          if (Platform.OS === 'ios') {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }
          router.push('/savings-add');
        }}
      />
      <StatGrid>
        <StatCard label="Dây tích góp" value={`${query.data.rows.length}`} tone="blue" />
        <StatCard label="Ô đã đóng" value={`${query.data.totalClosed}`} tone="green" />
        <StatCard label="Còn lại" value={formatCurrency(query.data.totalRemaining)} tone="gold" />
      </StatGrid>
      <ListPanel title="Danh sách">
        {query.data.rows.map((row) => (
          <ListRow
            key={row.id}
            title={row.label}
            subtitle={row.closed ? 'Đã hoàn tất' : `${row.periods_left} kỳ còn lại`}
            value={formatCurrency(row.remaining_amount)}
            valueTone={row.closed ? 'positive' : 'default'}
          />
        ))}
      </ListPanel>
    </>
  );
}

function IpadPanel() {
  const query = useQuery({ queryKey: ['mobile', 'ipad'], queryFn: getIpadDashboard });

  if (query.isLoading) return <LoadingState />;
  if (query.error || !query.data) return <EmptyState message="Không tải được dữ liệu iPad." />;

  return (
    <>
      <NativeActionButton
        label="Nhập máy"
        systemImage="ipad.and.arrow.forward"
        prominent
        onPress={() => {
          if (Platform.OS === 'ios') {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }
          router.push('/ipad-add');
        }}
      />
      <StatGrid>
        <StatCard label="Trong kho" value={`${query.data.inStockCount}`} tone="blue" />
        <StatCard label="Đã bán" value={`${query.data.soldCount}`} tone="green" />
        <StatCard label="Vốn tồn" value={formatCurrency(query.data.totalCost)} tone="gold" />
        <StatCard label="Lãi đã chốt" value={formatCurrency(query.data.realizedProfit)} tone="green" />
      </StatGrid>
      <ListPanel title="Máy gần đây">
        {query.data.transactions.map((row) => (
          <ListRow
            key={row.id}
            title={row.device_name}
            subtitle={[row.storage, row.color, row.status === 'sold' ? 'Đã bán' : 'Trong kho'].filter(Boolean).join(' - ')}
            value={formatCurrency(row.selling_price ?? row.total_cost)}
            valueTone={row.status === 'sold' ? 'positive' : 'default'}
            onPress={row.status !== 'sold' ? () => {
              if (Platform.OS === 'ios') {
                void Haptics.selectionAsync();
              }
              router.push({ pathname: '/ipad-sell', params: { id: row.id } });
            } : undefined}
          />
        ))}
      </ListPanel>
    </>
  );
}

function SettingsPanel() {
  const capabilities = useMemo(
    () => [
      'Expo SDK 56 + React Native 0.85',
      '@expo/ui SwiftUI Host/Button/Picker',
      'NativeTabs với iOS 26 liquid glass',
      'expo-glass-effect sẵn sàng cho form sheet',
      'Supabase data wiring dùng cùng schema web',
    ],
    []
  );

  return (
    <>
      <StatGrid>
        <StatCard label="Supabase env" value={hasSupabaseEnv ? 'Ready' : 'Missing'} tone={hasSupabaseEnv ? 'green' : 'red'} />
        <StatCard label="Platform" value={Platform.OS} tone="blue" />
      </StatGrid>
      <ListPanel title="Native direction">
        {capabilities.map((item) => (
          <ListRow key={item} title={item} />
        ))}
      </ListPanel>
      <View style={{ gap: 8 }}>
        <Text selectable style={{ color: '#64748B', fontSize: 13, lineHeight: 18 }}>
          Đặt env trong apps/mobile/.env.local bằng EXPO_PUBLIC_SUPABASE_URL và
          EXPO_PUBLIC_SUPABASE_ANON_KEY. Những form CRUD tiếp theo nên dùng formSheet + SwiftUI
          controls để lấy native iOS 26 behavior.
        </Text>
      </View>
    </>
  );
}

function showNativeTodo(title: string) {
  if (Platform.OS === 'ios') {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }

  Alert.alert(title, 'Đã dựng native action. Bước tiếp theo là port form CRUD web sang formSheet SwiftUI.');
}
