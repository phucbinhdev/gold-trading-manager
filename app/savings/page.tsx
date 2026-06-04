"use client";

import { PiggyBank } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { SavingsBoard } from "./_components/SavingsBoard";
import {
  SavingsProvider,
  useSavingsState,
} from "./_components/SavingsContext";
import { SavingsForm } from "./_components/SavingsForm";

function SavingsPageContent() {
  const { rows, loading, error } = useSavingsState();

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

      <SavingsForm />

      {loading ? (
        <Card className="rounded-2xl py-10 text-center text-sm text-muted-foreground">
          Đang tải dữ liệu...
        </Card>
      ) : (
        <SavingsBoard />
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
