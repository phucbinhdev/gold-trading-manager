"use client";

import { useCallback, useEffect } from "react";
import { PiggyBank } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { supabase } from "@/lib/supabase/client";
import { SavingsBoard } from "./_components/SavingsBoard";
import {
  SavingsProvider,
  type SavingsRow,
  type SavingsRowInput,
  useSavingsDispatch,
  useSavingsState,
} from "./_components/SavingsContext";
import { SavingsForm } from "./_components/SavingsForm";

function getCurrentMonthKey() {
  return new Date().toISOString().slice(0, 7);
}

function normalizeRows(rows: SavingsRow[] | null): SavingsRow[] {
  const monthKey = getCurrentMonthKey();

  return (rows || []).map((row) => {
    const monthCells = row.month_cells || {};

    return {
      ...row,
      month_cells: monthCells,
      closed: Boolean(monthCells[monthKey]),
    };
  });
}

function SavingsPageContent() {
  const { rows, loading, saving, error } = useSavingsState();
  const dispatch = useSavingsDispatch();

  const fetchRows = useCallback(async (showLoading = true) => {
    if (showLoading) {
      dispatch({ type: "load_start" });
    }

    const { data, error } = await supabase
      .from("savings")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) {
      dispatch({ type: "load_error", error: error.message });
      return;
    }

    dispatch({ type: "load_success", rows: normalizeRows(data || []) });
  }, [dispatch]);

  useEffect(() => {
    let active = true;

    const fetchInitialRows = async () => {
      const { data, error } = await supabase
        .from("savings")
        .select("*")
        .order("created_at", { ascending: true });

      if (!active) return;

      if (error) {
        dispatch({ type: "load_error", error: error.message });
        return;
      }

      dispatch({ type: "load_success", rows: normalizeRows(data || []) });
    };

    fetchInitialRows();

    return () => {
      active = false;
    };
  }, [dispatch]);

  const handleAddRow = async (input: SavingsRowInput) => {
    dispatch({ type: "saving_start" });

    const { error } = await supabase.from("savings").insert({
      label: input.label,
      period_amount: input.period_amount,
      periods_left: input.periods_left,
      remaining_amount: input.remaining_amount,
      closed: false,
      month_cells: {},
      closed_count: 0,
    });

    if (error) {
      dispatch({ type: "set_error", error: error.message });
    } else {
      await fetchRows(false);
    }

    dispatch({ type: "saving_end" });
  };

  const handleToggleClosed = async (row: SavingsRow) => {
    dispatch({ type: "set_error", error: null });

    const nextClosed = !row.closed;
    const monthKey = getCurrentMonthKey();
    const nextMonthCells = { ...(row.month_cells || {}) };
    nextMonthCells[monthKey] = nextClosed;

    const patch: Record<string, unknown> = {
      closed: nextClosed,
      month_cells: nextMonthCells,
    };

    if (nextClosed) {
      patch.periods_left = Math.max(0, (row.periods_left || 0) - 1);
      patch.remaining_amount = Math.max(
        0,
        (row.remaining_amount || 0) - (row.period_amount || 0),
      );
      patch.closed_count = (row.closed_count || 0) + 1;
    } else {
      patch.periods_left = (row.periods_left || 0) + 1;
      patch.remaining_amount =
        (row.remaining_amount || 0) + (row.period_amount || 0);
      patch.closed_count = Math.max(0, (row.closed_count || 0) - 1);
    }

    const { error } = await supabase
      .from("savings")
      .update(patch)
      .eq("id", row.id);

    if (error) {
      dispatch({ type: "set_error", error: error.message });
    } else {
      await fetchRows(false);
    }
  };

  const handleRemoveRow = async (rowId: string) => {
    dispatch({ type: "set_error", error: null });

    const { error } = await supabase
      .from("savings")
      .delete()
      .eq("id", rowId);

    if (error) {
      dispatch({ type: "set_error", error: error.message });
    } else {
      await fetchRows(false);
    }
  };

  const totalPeriodAmount = rows.reduce(
    (sum, row) => sum + (row.period_amount || 0),
    0,
  );
  const totalRemaining = rows.reduce(
    (sum, row) => sum + (row.remaining_amount || 0),
    0,
  );
  const totalClosedCount = rows.reduce(
    (sum, row) => sum + (row.closed_count || 0),
    0,
  );

  return (
    <div className="min-h-screen bg-background font-sans text-foreground pb-24 px-4 py-6 space-y-6 max-w-5xl mx-auto">
      <PageHeader
        title="Tích Góp"
        subtitle="Theo dõi khoản tiết kiệm và các đợt đóng theo tháng"
        icon={<PiggyBank className="w-6 h-6 text-white" />}
        iconColor="bg-gradient-to-br from-emerald-500 to-teal-600"
        showSettings
      />

      {error && (
        <p className="text-sm text-destructive">Lỗi: {error}</p>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="rounded-2xl py-4">
          <CardContent className="space-y-1 px-4">
            <p className="text-xs font-semibold uppercase text-muted-foreground">
              Tổng mệnh giá/kỳ
            </p>
            <p className="text-2xl font-bold">
              {formatCurrency(totalPeriodAmount)}
            </p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl py-4">
          <CardContent className="space-y-1 px-4">
            <p className="text-xs font-semibold uppercase text-muted-foreground">
              Tiền còn lại
            </p>
            <p className="text-2xl font-bold">
              {formatCurrency(totalRemaining)}
            </p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl py-4">
          <CardContent className="space-y-1 px-4">
            <p className="text-xs font-semibold uppercase text-muted-foreground">
              Đã đóng
            </p>
            <p className="text-2xl font-bold">{totalClosedCount}</p>
          </CardContent>
        </Card>
      </div>

      <SavingsForm onAdd={handleAddRow} disabled={saving} />

      {loading ? (
        <Card className="rounded-2xl py-10 text-center text-sm text-muted-foreground">
          Đang tải dữ liệu...
        </Card>
      ) : (
        <SavingsBoard
          rows={rows}
          onToggleClosed={handleToggleClosed}
          onRemove={handleRemoveRow}
        />
      )}
    </div>
  );
}

export default function SavingsPage() {
  return (
    <SavingsProvider>
      <SavingsPageContent />
    </SavingsProvider>
  );
}
