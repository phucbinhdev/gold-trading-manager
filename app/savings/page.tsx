"use client";

import { useEffect, useState } from "react";
import { PiggyBank, Target } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { supabase } from "@/lib/supabase/client";
import { SavingsBoard } from "./_components/SavingsBoard";
import { SavingsForm } from "./_components/SavingsForm";

export type SavingsRow = {
  id: string;
  created_at: string;
  label: string;
  period_amount: number;
  periods_left: number;
  remaining_amount: number;
  closed: boolean;
  month_cells: Record<string, boolean>;
  closed_count: number;
};

export type SavingsRowInput = Omit<
  SavingsRow,
  "id" | "created_at" | "month_cells" | "closed_count" | "closed"
> & { month_cells?: Record<string, boolean> };
export default function SavingsPage() {
  const [rows, setRows] = useState<SavingsRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRows = async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from("savings")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) setError(error.message);
    setRows(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchRows();
  }, []);

  const handleAddRow = async (input: SavingsRowInput) => {
    setSaving(true);
    setError(null);

    const { error } = await supabase.from("savings").insert({
      label: input.label,
      period_amount: input.period_amount,
      periods_left: input.periods_left,
      remaining_amount: input.remaining_amount,
      closed: false,
      month_cells: {},
      closed_count: 0,
    });

    if (error) setError(error.message);
    await fetchRows();
    setSaving(false);
  };

  const handleToggleClosed = async (row: SavingsRow) => {
    setError(null);
    const nextClosed = !row.closed;
    const monthKey = new Date().toISOString().slice(0, 7);
    const nextMonthCells = { ...(row.month_cells || {}) };
    nextMonthCells[monthKey] = nextClosed;

    const patch: Record<string, unknown> = {
      closed: nextClosed,
      month_cells: nextMonthCells,
    };

    if (!nextClosed) {
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

    if (error) setError(error.message);
    await fetchRows();
  };

  const handleRemoveRow = async (rowId: string) => {
    setError(null);
    const { error } = await supabase
      .from("savings")
      .delete()
      .eq("id", rowId);

    if (error) setError(error.message);
    await fetchRows();
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
