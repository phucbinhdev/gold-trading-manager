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

        <Card className="sticky top-[calc(env(safe-area-inset-top)+1rem)] z-30 overflow-hidden rounded-[24px] border-0 bg-card/95 py-0 shadow-[0_14px_35px_rgba(15,23,42,0.10)] backdrop-blur">
          <CardContent className="p-0">
            <div className="p-3">
              <div className="flex items-center gap-3">
                <div className="text-3xl leading-9">🎯</div>
                <div>
                  <p className="text-[11px] font-black uppercase leading-4 tracking-wide text-emerald-700">
                    Mục tiêu
                  </p>
                  <p className="text-2xl font-black leading-8 text-emerald-700">
                    {formatCurrency(summary.goal)}
                  </p>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-3">
                <div className="h-3 flex-1 overflow-hidden rounded-full bg-emerald-100">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-600 to-green-500 shadow-inner transition-all"
                    style={{ width: `${Math.min(100, progress)}%` }}
                  />
                </div>
                <span className="min-w-12 text-right text-xs font-black leading-4 text-slate-700">
                  {progress}%
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 overflow-hidden border-t bg-background/60 px-5 py-2 text-[11px] leading-4">
              <div className="flex items-center gap-1.5">
                <p className="whitespace-nowrap font-black uppercase text-slate-600">Đã đóng</p>
                <p className="whitespace-nowrap text-xs font-black leading-4 text-emerald-700">
                  {formatCurrency(summary.paid)}
                </p>
              </div>
              <div className="flex items-center gap-1.5 border-l pl-4">
                <p className="whitespace-nowrap font-black uppercase text-slate-600">Còn lại</p>
                <p className="whitespace-nowrap text-xs font-black leading-4 text-orange-600">
                  {formatCurrency(summary.remaining)}
                </p>
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
