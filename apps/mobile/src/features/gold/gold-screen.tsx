import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useColorScheme,
} from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import ReanimatedSwipeable, {
  SwipeableMethods,
} from "react-native-gesture-handler/ReanimatedSwipeable";

import { EmptyState, LoadingState } from "@/components/dashboard/screen";
import { NativeActionButton } from "@/components/native/native-action-button";
import { formatCurrency, formatNumber } from "@/lib/format/currency";
import {
  deleteGoldTransaction,
  GoldTransaction,
  getGoldDashboard,
  updateMarketPrice,
} from "@/lib/supabase/queries";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type GoldData = Awaited<ReturnType<typeof getGoldDashboard>>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getYear(dateStr: string): string {
  return dateStr.slice(0, 4);
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function OverviewCard({
  data,
  dark,
  onEditPrice,
}: {
  data: GoldData;
  dark: boolean;
  onEditPrice: () => void;
}) {
  const isProfit = data.profit >= 0;

  return (
    <View style={[styles.overviewCard, { backgroundColor: "#EAA20D" }]}>
      {/* Inner highlight layer */}
      <View style={styles.overviewInner}>
        {/* Header row */}
        <View style={styles.overviewHeader}>
          <Text style={styles.overviewLabel}>Tổng Tài Sản</Text>
          <TouchableOpacity
            onPress={onEditPrice}
            activeOpacity={0.7}
            style={styles.editButton}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.editButtonIcon}>✏️</Text>
          </TouchableOpacity>
        </View>

        {/* Total value */}
        <Text style={styles.overviewValue}>
          {formatCurrency(data.marketValue)}
        </Text>

        {/* Profit pill */}
        <View
          style={[
            styles.profitPill,
            {
              backgroundColor: isProfit
                ? "rgba(5, 150, 105, 0.25)"
                : "rgba(220, 38, 38, 0.25)",
            },
          ]}
        >
          <Text
            style={[
              styles.profitPillText,
              { color: isProfit ? "#ECFDF5" : "#FEF2F2" },
            ]}
          >
            {isProfit ? "▲" : "▼"} {formatCurrency(data.profit)}
          </Text>
        </View>

        {/* Stats row */}
        <View style={styles.overviewStatsRow}>
          <View style={styles.overviewStat}>
            <Text style={styles.overviewStatLabel}>Chỉ vàng</Text>
            <Text style={styles.overviewStatValue}>
              {formatNumber(data.totalChi, " chỉ")}
            </Text>
          </View>

          <View style={styles.overviewDivider} />

          <View style={styles.overviewStat}>
            <Text style={styles.overviewStatLabel}>Giá TT</Text>
            <Text style={styles.overviewStatValue}>
              {formatCurrency(data.marketPrice)}
            </Text>
          </View>

          <View style={styles.overviewDivider} />

          <View style={styles.overviewStat}>
            <Text style={styles.overviewStatLabel}>Vốn</Text>
            <Text style={styles.overviewStatValue}>
              {formatCurrency(data.totalInvested)}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

function YearFilterBar({
  years,
  selectedYear,
  onSelect,
}: {
  years: string[];
  selectedYear: string;
  onSelect: (year: string) => void;
}) {
  const allOptions = ["all", ...years];

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.yearFilterScroll}
      contentContainerStyle={styles.yearFilterContent}
    >
      {allOptions.map((year) => {
        const active = selectedYear === year;
        return (
          <TouchableOpacity
            key={year}
            onPress={() => onSelect(year)}
            activeOpacity={0.7}
            style={[
              styles.yearFilterBtn,
              active
                ? styles.yearFilterBtnActive
                : styles.yearFilterBtnInactive,
            ]}
          >
            <Text
              style={[
                styles.yearFilterBtnText,
                active
                  ? styles.yearFilterBtnTextActive
                  : styles.yearFilterBtnTextInactive,
              ]}
            >
              {year === "all" ? "Tất cả" : year}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

function TransactionCard({
  item,
  dark,
  onDelete,
}: {
  item: GoldTransaction;
  dark: boolean;
  onDelete: (item: GoldTransaction, swipeable: SwipeableMethods) => void;
}) {
  const totalPrice =
    item.total_price ?? Number(item.amount_chi) * Number(item.price_per_chi);

  return (
    <ReanimatedSwipeable
      friction={2}
      rightThreshold={36}
      overshootRight={false}
      enableTrackpadTwoFingerGesture
      containerStyle={styles.swipeContainer}
      renderRightActions={(_, __, swipeable) => (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Xóa giao dịch ngày ${formatDate(item.transaction_date)}`}
          onPress={() => onDelete(item, swipeable)}
          style={styles.deleteAction}
        >
          <Text style={styles.deleteActionIcon}>⌫</Text>
          <Text style={styles.deleteActionText}>Xóa</Text>
        </Pressable>
      )}
    >
      <View
        style={[
          styles.transactionCard,
          { backgroundColor: dark ? "#1E293B" : "#FFFFFF" },
        ]}
      >
        {/* Left: icon + info */}
        <View style={styles.transactionLeft}>
          <View style={styles.transactionIcon}>
            <Text style={styles.transactionIconText}>
              {formatNumber(item.amount_chi)}
            </Text>
            <Text style={styles.transactionIconSub}>chỉ</Text>
          </View>

          <View style={styles.transactionInfo}>
            <Text
              style={[
                styles.transactionDate,
                { color: dark ? "#CBD5E1" : "#374151" },
              ]}
            >
              {formatDate(item.transaction_date)}
            </Text>
            {item.note ? (
              <Text
                style={[
                  styles.transactionNote,
                  { color: dark ? "#94A3B8" : "#6B7280" },
                ]}
                numberOfLines={1}
              >
                {item.note}
              </Text>
            ) : (
              <Text
                style={[
                  styles.transactionNote,
                  { color: dark ? "#475569" : "#9CA3AF" },
                ]}
              >
                Không có ghi chú
              </Text>
            )}
          </View>
        </View>

        {/* Right: price */}
        <Text
          style={[
            styles.transactionPrice,
            { color: dark ? "#F1F5F9" : "#111827" },
          ]}
        >
          {formatCurrency(totalPrice)}
        </Text>
      </View>
    </ReanimatedSwipeable>
  );
}

function EditPriceModal({
  visible,
  currentPrice,
  onClose,
  onSave,
  loading,
}: {
  visible: boolean;
  currentPrice: number;
  onClose: () => void;
  onSave: (price: number) => void;
  loading: boolean;
}) {
  const [value, setValue] = useState(String(currentPrice));
  const dark = useColorScheme() === "dark";

  const handleSave = () => {
    const parsed = Number(value.replace(/[^0-9]/g, ""));
    if (!parsed || parsed <= 0) {
      Alert.alert("Lỗi", "Vui lòng nhập giá hợp lệ.");
      return;
    }
    onSave(parsed);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View
          style={[
            styles.modalContainer,
            { backgroundColor: dark ? "#1E293B" : "#FFFFFF" },
          ]}
        >
          <Text
            style={[styles.modalTitle, { color: dark ? "#F1F5F9" : "#111827" }]}
          >
            Cập nhật giá thị trường
          </Text>

          <TextInput
            style={[
              styles.modalInput,
              {
                backgroundColor: dark ? "#0F172A" : "#F8FAFC",
                color: dark ? "#F1F5F9" : "#111827",
                borderColor: dark ? "#334155" : "#E2E8F0",
              },
            ]}
            value={value}
            onChangeText={setValue}
            keyboardType="numeric"
            placeholder="Nhập giá mỗi chỉ (VND)"
            placeholderTextColor={dark ? "#475569" : "#94A3B8"}
            autoFocus
          />

          <View style={styles.modalActions}>
            <TouchableOpacity
              onPress={handleSave}
              activeOpacity={0.7}
              style={[styles.modalBtn, styles.modalBtnSave]}
              disabled={loading}
            >
              <Text style={styles.modalBtnSaveText}>
                {loading ? "Đang lưu..." : "Lưu"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------

export default function GoldScreen() {
  const scheme = useColorScheme();
  const dark = scheme === "dark";
  const queryClient = useQueryClient();

  const [selectedYear, setSelectedYear] = useState<string>("all");
  const [showEditPrice, setShowEditPrice] = useState(false);

  const query = useQuery({
    queryKey: ["mobile", "gold"],
    queryFn: getGoldDashboard,
  });

  const mutation = useMutation({
    mutationFn: updateMarketPrice,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["mobile", "gold"] });
      setShowEditPrice(false);
      if (Platform.OS === "ios") {
        void Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success,
        );
      }
    },
    onError: () => {
      Alert.alert("Lỗi", "Không thể cập nhật giá. Vui lòng thử lại.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteGoldTransaction,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["mobile", "gold"] });
      if (Platform.OS === "ios") {
        void Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success,
        );
      }
    },
    onError: () => {
      Alert.alert("Lỗi", "Không thể xóa giao dịch. Vui lòng thử lại.");
    },
  });

  const onRefresh = useCallback(() => {
    void query.refetch();
  }, [query]);

  const years = useMemo(() => {
    if (!query.data?.transactions) return [];
    const yearSet = new Set<string>();
    for (const tx of query.data.transactions) {
      yearSet.add(getYear(tx.transaction_date));
    }
    return Array.from(yearSet).sort((a, b) => b.localeCompare(a));
  }, [query.data?.transactions]);

  const filteredTransactions = useMemo(() => {
    if (!query.data?.transactions) return [];
    if (selectedYear === "all") return query.data.transactions;
    return query.data.transactions.filter(
      (tx) => getYear(tx.transaction_date) === selectedYear,
    );
  }, [query.data?.transactions, selectedYear]);

  const handleFAB = () => {
    if (Platform.OS === "ios") {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push("/gold-add");
  };

  const handleDelete = (item: GoldTransaction, swipeable: SwipeableMethods) => {
    if (Platform.OS === "ios") {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    Alert.alert(
      "Xóa giao dịch?",
      `Giao dịch ${formatNumber(item.amount_chi, " chỉ")} ngày ${formatDate(item.transaction_date)} sẽ bị xóa vĩnh viễn.`,
      [
        { text: "Hủy", style: "cancel", onPress: () => swipeable.close() },
        {
          text: "Xóa",
          style: "destructive",
          onPress: () => deleteMutation.mutate(item.id),
        },
      ],
    );
  };

  const bgColor = dark ? "#020617" : "#F8FAFC";

  return (
    <View style={[styles.root, { backgroundColor: bgColor }]}>
      {/* Header + overview + year filter are part of the list header */}
      <FlatList
        data={filteredTransactions}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContent,
          filteredTransactions.length === 0 && styles.listContentEmpty,
        ]}
        refreshControl={
          <RefreshControl
            refreshing={query.isFetching && !query.isLoading}
            onRefresh={onRefresh}
          />
        }
        ListHeaderComponent={
          <View style={styles.listHeader}>
            {/* Screen title */}
            <View style={styles.titleBlock}>
              <Text
                style={[
                  styles.screenTitle,
                  { color: dark ? "#F8FAFC" : "#0F172A" },
                ]}
              >
                Quản Lý Vàng
              </Text>
              <Text
                style={[
                  styles.screenSubtitle,
                  { color: dark ? "#CBD5E1" : "#64748B" },
                ]}
              >
                Danh mục vàng, giá thị trường và lợi nhuận tạm tính.
              </Text>
            </View>

            {/* Loading / error / content */}
            {query.isLoading ? (
              <LoadingState />
            ) : query.error || !query.data ? (
              <EmptyState message="Không tải được dữ liệu vàng." />
            ) : (
              <>
                <OverviewCard
                  data={query.data}
                  dark={dark}
                  onEditPrice={() => setShowEditPrice(true)}
                />

                <YearFilterBar
                  years={years}
                  selectedYear={selectedYear}
                  onSelect={setSelectedYear}
                />

                <Text
                  style={[
                    styles.sectionTitle,
                    { color: dark ? "#94A3B8" : "#6B7280" },
                  ]}
                >
                  {selectedYear === "all"
                    ? "Tất cả giao dịch"
                    : `Giao dịch năm ${selectedYear}`}
                  {"  "}
                  <Text style={{ fontWeight: "400" }}>
                    ({filteredTransactions.length})
                  </Text>
                </Text>
              </>
            )}
          </View>
        }
        renderItem={({ item }) => (
          <TransactionCard item={item} dark={dark} onDelete={handleDelete} />
        )}
        ListEmptyComponent={
          !query.isLoading && !query.error ? (
            <EmptyState message="Chưa có giao dịch nào." />
          ) : null
        }
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
      />

      {/* FAB */}
      <TouchableOpacity
        onPress={handleFAB}
        activeOpacity={0.85}
        style={styles.fab}
      >
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>

      {/* Edit price modal */}
      {query.data && (
        <EditPriceModal
          visible={showEditPrice}
          currentPrice={query.data.marketPrice}
          onClose={() => setShowEditPrice(false)}
          onSave={(price) => mutation.mutate(price)}
          loading={mutation.isPending}
        />
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },

  // List layout
  listContent: {
    paddingHorizontal: 18,
    paddingTop: 0,
    paddingBottom: 120,
    gap: 0,
  },
  listContentEmpty: {
    flexGrow: 1,
  },
  listHeader: {
    gap: 16,
    paddingTop: 24,
    paddingBottom: 12,
  },

  // Title block
  titleBlock: {
    gap: 6,
  },
  screenTitle: {
    fontSize: 34,
    fontWeight: "800",
  },
  screenSubtitle: {
    fontSize: 16,
    lineHeight: 22,
  },

  // Overview card
  overviewCard: {
    borderRadius: 24,
    overflow: "hidden",
  },
  overviewInner: {
    padding: 20,
    gap: 12,
    backgroundColor: "rgba(248, 218, 59, 0.35)",
  },
  overviewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  overviewLabel: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    opacity: 0.9,
  },
  editButton: {
    backgroundColor: "rgba(255,255,255,0.25)",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  editButtonIcon: {
    fontSize: 14,
  },
  overviewValue: {
    color: "#FFFFFF",
    fontSize: 32,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  profitPill: {
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  profitPillText: {
    fontSize: 14,
    fontWeight: "700",
  },
  overviewStatsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  overviewStat: {
    flex: 1,
    gap: 2,
  },
  overviewStatLabel: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  overviewStatValue: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  overviewDivider: {
    width: 1,
    height: 32,
    backgroundColor: "rgba(255,255,255,0.3)",
    marginHorizontal: 12,
  },

  // Year filter
  yearFilterScroll: {
    flexGrow: 0,
  },
  yearFilterContent: {
    gap: 8,
    paddingRight: 4,
  },
  yearFilterBtn: {
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  yearFilterBtnActive: {
    backgroundColor: "#F4D125",
  },
  yearFilterBtnInactive: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#D1D5DB",
  },
  yearFilterBtnText: {
    fontSize: 14,
    fontWeight: "700",
  },
  yearFilterBtnTextActive: {
    color: "#78350F",
  },
  yearFilterBtnTextInactive: {
    color: "#6B7280",
  },

  // Section title
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: -4,
  },

  // Transaction card
  swipeContainer: {
    borderRadius: 16,
    overflow: "hidden",
  },
  transactionCard: {
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  deleteAction: {
    width: 88,
    backgroundColor: "#DC2626",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  deleteActionIcon: {
    color: "#FFFFFF",
    fontSize: 26,
    fontWeight: "700",
    lineHeight: 28,
  },
  deleteActionText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
  transactionLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  transactionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#10B981",
    alignItems: "center",
    justifyContent: "center",
  },
  transactionIconText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 16,
  },
  transactionIconSub: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 10,
    fontWeight: "600",
  },
  transactionInfo: {
    flex: 1,
    gap: 2,
  },
  transactionDate: {
    fontSize: 14,
    fontWeight: "600",
  },
  transactionNote: {
    fontSize: 12,
    lineHeight: 16,
  },
  transactionPrice: {
    fontSize: 15,
    fontWeight: "800",
    textAlign: "right",
  },

  // FAB
  fab: {
    position: "absolute",
    bottom: 32,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#EAA20D",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#EAA20D",
    shadowOpacity: 0.45,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  fabIcon: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "300",
    lineHeight: 32,
    marginTop: -2,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  modalContainer: {
    borderRadius: 20,
    padding: 24,
    width: "100%",
    gap: 16,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 17,
    fontWeight: "600",
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
  },
  modalBtn: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  modalBtnCancel: {
    backgroundColor: "#F1F5F9",
  },
  modalBtnCancelText: {
    color: "#374151",
    fontWeight: "700",
    fontSize: 15,
  },
  modalBtnSave: {
    backgroundColor: "#EAA20D",
  },
  modalBtnSaveText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 15,
  },
});
