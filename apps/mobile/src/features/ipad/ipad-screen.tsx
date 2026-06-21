import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ColorSchemeName,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
} from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { formatCurrency } from '@/lib/format/currency';
import {
  deleteIpadTransaction,
  getIpadDashboard,
  toggleIpadDebt,
  updateIpadSalePrice,
  updateIpadStatus,
} from '@/lib/supabase/queries';

type IpadStatus = 'importing' | 'in_stock' | 'sold';

type IpadTransaction = {
  id: string;
  created_at: string;
  purchase_date: string;
  device_name: string;
  storage: string | null;
  color: string | null;
  serial_number: string | null;
  purchase_price: number;
  extra_cost: number;
  loan_amount: number;
  selling_price: number | null;
  sale_date: string | null;
  note: string | null;
  debt_paid: boolean;
  debt_paid_at: string | null;
  total_cost: number;
  profit_amount: number | null;
  status: IpadStatus;
};

// ─── Status badge config ────────────────────────────────────────────────────

const STATUS_BADGE: Record<IpadStatus, { bg: string; text: string; label: string }> = {
  importing: { bg: '#E0F2FE', text: '#0369A1', label: 'Nhập hàng' },
  in_stock:  { bg: '#FEF3C7', text: '#B45309', label: 'Lưu kho'   },
  sold:      { bg: '#D1FAE5', text: '#065F46', label: 'Đã bán'    },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getTheme(scheme: ColorSchemeName) {
  const dark = scheme === 'dark';
  return {
    dark,
    bg:          dark ? '#0F172A' : '#F1F5F9',
    cardBg:      dark ? '#1E293B' : '#FFFFFF',
    textPrimary: dark ? '#F8FAFC' : '#0F172A',
    textMuted:   dark ? '#94A3B8' : '#64748B',
    border:      dark ? '#334155' : '#E2E8F0',
    filterInactive: {
      bg:   dark ? '#1E293B' : '#FFFFFF',
      text: dark ? '#94A3B8' : '#64748B',
    },
  };
}

// ─── Month filter pill ────────────────────────────────────────────────────────

function MonthPill({
  label,
  active,
  onPress,
  theme,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  theme: ReturnType<typeof getTheme>;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.monthPill,
        {
          backgroundColor: active ? '#0EA5E9' : theme.filterInactive.bg,
          borderColor: active ? '#0EA5E9' : theme.border,
        },
      ]}
    >
      <Text
        style={[
          styles.monthPillText,
          { color: active ? '#FFFFFF' : theme.filterInactive.text },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

// ─── Stat box inside summary card ────────────────────────────────────────────

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statBox}>
      <Text style={styles.statBoxLabel}>{label}</Text>
      <Text style={styles.statBoxValue}>{value}</Text>
    </View>
  );
}

// ─── Device card ─────────────────────────────────────────────────────────────

function DeviceCard({
  tx,
  theme,
  onToggleDebt,
}: {
  tx: IpadTransaction;
  theme: ReturnType<typeof getTheme>;
  onToggleDebt: (id: string, paid: boolean) => void;
}) {
  const badge = STATUS_BADGE[tx.status];
  const isSold = tx.status === 'sold';
  const profit = Number(tx.profit_amount ?? 0);

  const meta = [tx.purchase_date, tx.storage, tx.color].filter(Boolean).join(' · ');

  return (
    <View
      style={[
        styles.deviceCard,
        { backgroundColor: theme.cardBg, borderColor: theme.border },
      ]}
    >
      {/* Row 1: name + badges */}
      <View style={styles.deviceRow}>
        <Text
          style={[styles.deviceName, { color: theme.textPrimary }]}
          numberOfLines={1}
        >
          {tx.device_name}
        </Text>
        <View style={styles.badgeGroup}>
          <View style={[styles.badge, { backgroundColor: badge.bg }]}>
            <Text style={[styles.badgeText, { color: badge.text }]}>{badge.label}</Text>
          </View>
          {tx.loan_amount > 0 && (
            <View
              style={[
                styles.badge,
                {
                  backgroundColor: tx.debt_paid ? '#D1FAE5' : '#FEE2E2',
                  marginLeft: 4,
                },
              ]}
            >
              <Text
                style={[
                  styles.badgeText,
                  { color: tx.debt_paid ? '#065F46' : '#991B1B' },
                ]}
              >
                {tx.debt_paid ? 'Đã trả' : 'Còn nợ'}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Row 2: meta */}
      {!!meta && (
        <Text style={[styles.deviceMeta, { color: theme.textMuted }]}>{meta}</Text>
      )}

      {/* Row 3: financials */}
      <View style={styles.deviceFinancials}>
        <Text style={[styles.financialItem, { color: theme.textMuted }]}>
          Vốn: <Text style={{ color: theme.textPrimary }}>{formatCurrency(tx.total_cost)}</Text>
        </Text>
        {tx.loan_amount > 0 && (
          <Text style={[styles.financialItem, { color: theme.textMuted }]}>
            {' '}| Nợ: <Text style={{ color: '#EF4444' }}>{formatCurrency(tx.loan_amount)}</Text>
          </Text>
        )}
        {isSold && (
          <Text
            style={[
              styles.financialItem,
              { color: profit >= 0 ? '#10B981' : '#EF4444', marginLeft: 'auto' },
            ]}
          >
            {profit >= 0 ? '+' : ''}{formatCurrency(profit)}
          </Text>
        )}
      </View>

      {/* Row 4: actions (only if not sold) */}
      {!isSold && (
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.push(`/ipad-sell?id=${tx.id}` as never);
            }}
          >
            <Text style={styles.actionBtnText}>Bán máy</Text>
          </TouchableOpacity>

          {tx.loan_amount > 0 && (
            <TouchableOpacity
              style={[styles.actionBtn, styles.actionBtnSecondary]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onToggleDebt(tx.id, !tx.debt_paid);
              }}
            >
              <Text style={[styles.actionBtnText, { color: '#0EA5E9' }]}>
                {tx.debt_paid ? 'Chưa trả nợ' : 'Đã trả nợ'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function IpadScreen() {
  const scheme = useColorScheme();
  const theme = getTheme(scheme);
  const queryClient = useQueryClient();

  const [selectedMonth, setSelectedMonth] = useState<string>('all');

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['mobile', 'ipad'],
    queryFn: getIpadDashboard,
  });

  const toggleDebtMutation = useMutation({
    mutationFn: ({ id, paid }: { id: string; paid: boolean }) =>
      toggleIpadDebt(id, paid),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['mobile', 'ipad'] }),
    onError: (err: unknown) => {
      Alert.alert('Lỗi', err instanceof Error ? err.message : 'Không thể cập nhật nợ');
    },
  });

  const transactions: IpadTransaction[] = useMemo(
    () => (data?.transactions ?? []) as IpadTransaction[],
    [data],
  );

  // Unique months from purchase_date
  const months = useMemo(() => {
    const set = new Set<string>();
    transactions.forEach((tx) => {
      if (tx.purchase_date) set.add(tx.purchase_date.slice(0, 7));
    });
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [transactions]);

  // Filtered transactions
  const filteredTransactions = useMemo(() => {
    if (selectedMonth === 'all') return transactions;
    return transactions.filter(
      (tx) => tx.purchase_date && tx.purchase_date.slice(0, 7) === selectedMonth,
    );
  }, [transactions, selectedMonth]);

  // Summary from filtered
  const summary = useMemo(() => {
    const inStock = filteredTransactions.filter((tx) => tx.status !== 'sold');
    const sold = filteredTransactions.filter((tx) => tx.status === 'sold');
    return {
      totalCost:     inStock.reduce((s, tx) => s + Number(tx.total_cost ?? 0), 0),
      totalRevenue:  sold.reduce((s, tx) => s + Number(tx.selling_price ?? 0), 0),
      totalProfit:   sold.reduce((s, tx) => s + Number(tx.profit_amount ?? 0), 0),
      debtRemaining: filteredTransactions
        .filter((tx) => !tx.debt_paid)
        .reduce((s, tx) => s + Number(tx.loan_amount ?? 0), 0),
      soldCount:    sold.length,
      inStockCount: inStock.length,
    };
  }, [filteredTransactions]);

  if (isLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.bg }]}>
        <ActivityIndicator size="large" color="#0EA5E9" />
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: theme.bg }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor="#0EA5E9"
          />
        }
      >
        {/* Month filter */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          bounces={false}
          contentContainerStyle={styles.monthBar}
        >
          <MonthPill
            label="Tất cả"
            active={selectedMonth === 'all'}
            onPress={() => setSelectedMonth('all')}
            theme={theme}
          />
          {months.map((m) => (
            <MonthPill
              key={m}
              label={m}
              active={selectedMonth === m}
              onPress={() => setSelectedMonth(m)}
              theme={theme}
            />
          ))}
        </ScrollView>

        {/* Profit summary card */}
        <View style={styles.summaryCard}>
          {/* Profit header */}
          <View style={styles.summaryHeader}>
            <Text style={styles.summaryHeaderLabel}>Lợi nhuận</Text>
            <Text
              style={[
                styles.summaryHeaderValue,
                { color: summary.totalProfit >= 0 ? '#34D399' : '#F87171' },
              ]}
            >
              {summary.totalProfit >= 0 ? '+' : ''}
              {formatCurrency(summary.totalProfit)}
            </Text>
          </View>

          {/* Stats 2×2 grid */}
          <View style={styles.statsGrid}>
            <StatBox label="Tổng vốn kho" value={formatCurrency(summary.totalCost)} />
            <StatBox label="Doanh thu bán" value={formatCurrency(summary.totalRevenue)} />
            <StatBox label="Nợ chưa trả" value={formatCurrency(summary.debtRemaining)} />
            <StatBox
              label="Đã bán"
              value={`${summary.soldCount} máy`}
            />
          </View>
        </View>

        {/* Device list */}
        {filteredTransactions.length === 0 ? (
          <View style={[styles.emptyBox, { borderColor: theme.border }]}>
            <Text style={{ color: theme.textMuted, fontSize: 15 }}>
              Không có giao dịch nào
            </Text>
          </View>
        ) : (
          filteredTransactions.map((tx) => (
            <DeviceCard
              key={tx.id}
              tx={tx}
              theme={theme}
              onToggleDebt={(id, paid) =>
                toggleDebtMutation.mutate({ id, paid })
              }
            />
          ))
        )}

        {/* Bottom padding so FAB doesn't cover last card */}
        <View style={{ height: 88 }} />
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.85}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          router.push('/ipad-add' as never);
        }}
      >
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: 16,
  },

  // Month filter
  monthBar: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 14,
  },
  monthPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  monthPillText: {
    fontSize: 13,
    fontWeight: '600',
  },

  // Summary card
  summaryCard: {
    backgroundColor: '#020617',
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summaryHeaderLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '500',
  },
  summaryHeaderValue: {
    fontSize: 28,
    fontWeight: '700',
  },

  // Stats grid
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  statBox: {
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderRadius: 12,
    padding: 12,
    width: '47.5%',
  },
  statBoxLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 4,
    fontWeight: '500',
  },
  statBoxValue: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '700',
  },

  // Device card
  deviceCard: {
    borderRadius: 20,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
  },
  deviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
    marginRight: 8,
  },
  badgeGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  deviceMeta: {
    fontSize: 12,
    marginBottom: 8,
  },
  deviceFinancials: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 10,
  },
  financialItem: {
    fontSize: 13,
  },

  // Action buttons
  actionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    backgroundColor: '#0EA5E9',
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: 'center',
  },
  actionBtnSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#0EA5E9',
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // Empty state
  emptyBox: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // FAB
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 28,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#0EA5E9',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  fabIcon: {
    fontSize: 28,
    color: '#FFFFFF',
    fontWeight: '300',
    lineHeight: 32,
  },
});
