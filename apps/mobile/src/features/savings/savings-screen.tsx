import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useMemo } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useTheme } from '@/hooks/use-theme';
import { formatCurrency } from '@/lib/format/currency';
import {
  getSavingsDashboard,
  SavingsRow,
  toggleSavingsCell,
} from '@/lib/supabase/queries';

// ─── Types ────────────────────────────────────────────────────────────────────

type CellPaidAt = Record<string, string>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function shortDate(isoString: string): string {
  try {
    const d = new Date(isoString);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    return `${dd}/${mm}`;
  } catch {
    return '✓';
  }
}

// ─── CellButton ───────────────────────────────────────────────────────────────

interface CellButtonProps {
  index: number;
  cellKey: string;
  paidAt: string | undefined;
  onPress: (cellKey: string) => void;
  isDark: boolean;
}

function CellButton({ index, cellKey, paidAt, onPress, isDark }: CellButtonProps) {
  const checked = paidAt !== undefined;

  return (
    <Pressable
      onPress={() => onPress(cellKey)}
      style={({ pressed }) => [
        styles.cell,
        checked ? styles.cellChecked : [styles.cellUnchecked, isDark && styles.cellUncheckedDark],
        pressed && { opacity: 0.75 },
      ]}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={`Ô ${index + 1}`}
    >
      {checked ? (
        <Text style={styles.cellCheckedText} numberOfLines={1} adjustsFontSizeToFit>
          {shortDate(paidAt!)}
        </Text>
      ) : (
        <Text style={[styles.cellNumber, isDark && styles.cellNumberDark]}>{index + 1}</Text>
      )}
    </Pressable>
  );
}

// ─── WireCard ─────────────────────────────────────────────────────────────────

interface WireCardProps {
  row: SavingsRow;
  onToggle: (row: SavingsRow, cellKey: string) => void;
  isDark: boolean;
}

function WireCard({ row, onToggle, isDark }: WireCardProps) {
  const closedCount = Number(row.closed_count ?? 0);
  const periodsLeft = Number(row.periods_left ?? 0);
  const totalCells = closedCount + periodsLeft;
  const cellPaidAt: CellPaidAt = (row.cell_paid_at as CellPaidAt | null) ?? {};
  const paidAmount = Number(row.period_amount ?? 0) * closedCount;
  const remaining = Number(row.remaining_amount ?? 0);

  return (
    <View style={[styles.wireCard, isDark && styles.wireCardDark]}>
      {/* Header */}
      <View style={styles.wireCardHeader}>
        <Text style={[styles.wireCardLabel, isDark && styles.textDark]} numberOfLines={1}>
          {row.label}
        </Text>
        <View style={styles.badgePill}>
          <Text style={styles.badgeText}>
            {closedCount}/{totalCells}
          </Text>
        </View>
      </View>

      {/* Amount per cell */}
      <Text style={[styles.perCell, isDark && styles.perCellDark]}>
        {formatCurrency(Number(row.period_amount ?? 0))}/ô
      </Text>

      {/* Cell grid */}
      <View style={styles.cellGrid}>
        {Array.from({ length: totalCells }).map((_, i) => {
          const cellKey = String(i + 1);
          return (
            <CellButton
              key={cellKey}
              index={i}
              cellKey={cellKey}
              paidAt={cellPaidAt[cellKey]}
              onPress={(key) => onToggle(row, key)}
              isDark={isDark}
            />
          );
        })}
      </View>

      {/* Footer */}
      <View style={styles.wireCardFooter}>
        <Text style={styles.paidLabel}>
          Đã đóng:{' '}
          <Text style={styles.paidAmount}>{formatCurrency(paidAmount)}</Text>
        </Text>
        <Text style={styles.remainLabel}>
          Còn lại:{' '}
          <Text style={styles.remainAmount}>{formatCurrency(remaining)}</Text>
        </Text>
      </View>
    </View>
  );
}

// ─── SummaryCard ──────────────────────────────────────────────────────────────

interface SummaryCardProps {
  totalGoal: number;
  totalPaid: number;
  totalRemaining: number;
  progress: number;
}

function SummaryCard({ totalGoal, totalPaid, totalRemaining, progress }: SummaryCardProps) {
  const clampedProgress = Math.min(1, Math.max(0, progress));

  return (
    <View style={styles.summaryCard}>
      <Text style={styles.summaryLabel}>MUC TIEU</Text>
      <Text style={styles.summaryGoal}>{formatCurrency(totalGoal)}</Text>

      {/* Progress bar */}
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${clampedProgress * 100}%` as any }]} />
      </View>

      {/* Stats row */}
      <View style={styles.summaryRow}>
        <Text style={styles.summaryStatLabel}>
          Da dong: <Text style={styles.summaryStatValue}>{formatCurrency(totalPaid)}</Text>
        </Text>
        <Text style={styles.summaryStatLabelRight}>
          Con lai: <Text style={styles.summaryStatValueMuted}>{formatCurrency(totalRemaining)}</Text>
        </Text>
      </View>
    </View>
  );
}

// ─── SavingsScreen ────────────────────────────────────────────────────────────

export default function SavingsScreen() {
  const theme = useTheme();
  const isDark = theme.background === '#000000';
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['mobile', 'savings'],
    queryFn: getSavingsDashboard,
  });

  const toggleMutation = useMutation({
    mutationFn: ({
      id,
      cellKey,
      cellPaidAt,
      closedCount,
      periodsLeft,
      periodAmount,
    }: {
      id: string;
      cellKey: string;
      cellPaidAt: CellPaidAt;
      closedCount: number;
      periodsLeft: number;
      periodAmount: number;
    }) =>
      toggleSavingsCell(
        id,
        cellKey,
        cellPaidAt,
        {},
        closedCount,
        periodsLeft,
        periodAmount
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['mobile', 'savings'] });
    },
  });

  const { totalGoal, totalPaid, progress } = useMemo(() => {
    const rows = query.data?.rows ?? [];
    const goal = rows.reduce((sum, row) => {
      const pa = Number(row.period_amount ?? 0);
      const closed = Number(row.closed_count ?? 0);
      const left = Number(row.periods_left ?? 0);
      return sum + pa * (closed + left);
    }, 0);
    const paid = rows.reduce((sum, row) => {
      const pa = Number(row.period_amount ?? 0);
      const closed = Number(row.closed_count ?? 0);
      return sum + pa * closed;
    }, 0);
    return {
      totalGoal: goal,
      totalPaid: paid,
      progress: goal > 0 ? paid / goal : 0,
    };
  }, [query.data]);

  const totalRemaining = query.data?.totalRemaining ?? 0;

  function handleToggle(row: SavingsRow, cellKey: string) {
    if (Platform.OS === 'ios') {
      void Haptics.selectionAsync();
    }
    const cellPaidAt: CellPaidAt = (row.cell_paid_at as CellPaidAt | null) ?? {};
    toggleMutation.mutate({
      id: row.id,
      cellKey,
      cellPaidAt,
      closedCount: Number(row.closed_count ?? 0),
      periodsLeft: Number(row.periods_left ?? 0),
      periodAmount: Number(row.period_amount ?? 0),
    });
  }

  if (query.isLoading) {
    return (
      <View style={[styles.center, isDark && { backgroundColor: '#000' }]}>
        <ActivityIndicator size="large" color="#059669" />
      </View>
    );
  }

  if (query.error || !query.data) {
    return (
      <View style={[styles.center, isDark && { backgroundColor: '#000' }]}>
        <Text style={{ color: isDark ? '#fff' : '#000', fontSize: 15 }}>
          Khong tai duoc du lieu tich gop.
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={query.isFetching && !query.isLoading}
            onRefresh={() => void query.refetch()}
            tintColor="#059669"
          />
        }
      >
        <SummaryCard
          totalGoal={totalGoal}
          totalPaid={totalPaid}
          totalRemaining={totalRemaining}
          progress={progress}
        />

        {query.data.rows.map((row) => (
          <WireCard
            key={row.id}
            row={row}
            onToggle={handleToggle}
            isDark={isDark}
          />
        ))}

        {/* Bottom spacing for FAB */}
        <View style={{ height: 88 }} />
      </ScrollView>

      {/* FAB */}
      <Pressable
        style={({ pressed }) => [styles.fab, pressed && { opacity: 0.82 }]}
        onPress={() => {
          if (Platform.OS === 'ios') {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }
          router.push('/savings-add');
        }}
        accessibilityRole="button"
        accessibilityLabel="Them day tich gop"
      >
        <Text style={styles.fabIcon}>+</Text>
      </Pressable>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  containerDark: {
    backgroundColor: '#0A0A0A',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingTop: 20,
  },

  // ── Summary card ──
  summaryCard: {
    backgroundColor: '#059669',
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
  },
  summaryLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  summaryGoal: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 16,
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginBottom: 14,
    overflow: 'hidden',
  },
  progressFill: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryStatLabel: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '500',
  },
  summaryStatValue: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  summaryStatLabelRight: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
    fontWeight: '500',
  },
  summaryStatValueMuted: {
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '700',
  },

  // ── Wire card ──
  wireCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  wireCardDark: {
    backgroundColor: '#1C1C1E',
    shadowOpacity: 0,
  },
  wireCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  wireCardLabel: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
    flex: 1,
    marginRight: 8,
  },
  textDark: {
    color: '#F9FAFB',
  },
  badgePill: {
    backgroundColor: '#D1FAE5',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  badgeText: {
    color: '#065F46',
    fontSize: 12,
    fontWeight: '600',
  },
  perCell: {
    color: '#6B7280',
    fontSize: 13,
    marginBottom: 4,
  },
  perCellDark: {
    color: '#9CA3AF',
  },

  // ── Cell grid ──
  cellGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
    marginBottom: 14,
  },
  cell: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellChecked: {
    backgroundColor: '#059669',
  },
  cellUnchecked: {
    borderWidth: 1.5,
    borderColor: '#D1FAE5',
    backgroundColor: 'transparent',
  },
  cellUncheckedDark: {
    borderColor: '#065F46',
  },
  cellCheckedText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
  },
  cellNumber: {
    color: '#9CA3AF',
    fontSize: 13,
    fontWeight: '500',
  },
  cellNumberDark: {
    color: '#6B7280',
  },

  // ── Wire card footer ──
  wireCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#F3F4F6',
    paddingTop: 10,
  },
  paidLabel: {
    color: '#6B7280',
    fontSize: 13,
  },
  paidAmount: {
    color: '#059669',
    fontWeight: '600',
  },
  remainLabel: {
    color: '#6B7280',
    fontSize: 13,
  },
  remainAmount: {
    color: '#EA580C',
    fontWeight: '600',
  },

  // ── FAB ──
  fab: {
    position: 'absolute',
    bottom: 28,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.38,
    shadowRadius: 10,
    elevation: 8,
  },
  fabIcon: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '400',
    lineHeight: 32,
    marginTop: -2,
  },
});
