"use client";

import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/PageHeader";
import { formatCurrency } from "@/lib/utils";
import { PiggyBank } from "lucide-react";
import { SavingsBoard } from "./_components/SavingsBoard";
import {
  getTotalCells,
  SavingsProvider,
  useSavingsState,
} from "./_components/SavingsContext";
import { SavingsForm } from "./_components/SavingsForm";
import { Loading } from "@/components/ui/PageLayout";

function SavingsPageContent() {
  const { rows, loading, error } = useSavingsState();

  const summary = rows.reduce(
    (acc, row) => {
      const totalCells = getTotalCells(row);
      const goal = totalCells * (row.period_amount || 0);
      const paid = (row.closed_count || 0) * (row.period_amount || 0);

      return {
        goal: acc.goal + goal,
        paid: acc.paid + paid,
        remaining: acc.remaining + Math.max(0, goal - paid),
        totalCells: acc.totalCells + totalCells,
        closedCells: acc.closedCells + (row.closed_count || 0),
      };
    },
    { goal: 0, paid: 0, remaining: 0, totalCells: 0, closedCells: 0 },
  );
  const progress = summary.goal > 0 ? Math.round((summary.paid / summary.goal) * 100) : 0;

  return (
    <div className="min-h-dvh bg-[radial-gradient(circle_at_top,color-mix(in_oklab,var(--primary)_20%,transparent)_0%,color-mix(in_oklab,var(--muted)_88%,transparent)_42%,var(--background)_78%)] text-foreground">
      <div className="page-shell app-container space-y-4">
        <PageHeader
          title="Tích góp"
          subtitle="Theo dõi mục tiêu tiết kiệm"
          icon={<PiggyBank className="h-6 w-6 text-white" />}
          iconColor="bg-gradient-to-br from-emerald-500 to-green-600"
        />

        {error && (
          <p className="rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
            Lỗi: {error}
          </p>
        )}

        <Card className="overflow-hidden rounded-[32px] border-0 bg-card/90 py-0 shadow-[0_14px_35px_rgba(15,23,42,0.10)] backdrop-blur">
          <CardContent className="p-0">
            <div className="grid gap-4 p-5 md:grid-cols-[1fr_180px] md:items-center">
              <div>
                <div className="flex items-center gap-3">
                  <div className="text-5xl">🎯</div>
                  <div>
                    <p className="text-sm font-black uppercase tracking-wide text-emerald-700">Mục tiêu</p>
                    <p className="text-3xl font-black text-emerald-700">{formatCurrency(summary.goal)}</p>
                  </div>
                </div>
                <div className="mt-5 flex items-center gap-3">
                  <div className="h-5 flex-1 overflow-hidden rounded-full bg-emerald-100">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-600 to-green-500 shadow-inner transition-all"
                      style={{ width: `${Math.min(100, progress)}%` }}
                    />
                  </div>
                  <span className="min-w-12 text-right text-sm font-black text-slate-700">{progress}%</span>
                </div>
              </div>
              <div className="flex justify-center text-7xl md:text-8xl">🧰</div>
            </div>

            <div className="grid grid-cols-2 border-t bg-background/60 px-5 py-4 text-sm">
              <div>
                <p className="font-black uppercase text-slate-600">Đã đóng</p>
                <p className="mt-1 text-lg font-black text-emerald-700">{formatCurrency(summary.paid)}</p>
              </div>
              <div className="border-l pl-4">
                <p className="font-black uppercase text-slate-600">Còn lại</p>
                <p className="mt-1 text-lg font-black text-orange-600">{formatCurrency(summary.remaining)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <SavingsForm />

        {loading ? (
          <Loading />
        ) : (
          <SavingsBoard />
        )}
      </div>
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
