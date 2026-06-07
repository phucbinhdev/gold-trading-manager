"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { PageHeader } from "@/components/ui/PageHeader";
import { formatCurrency } from "@/lib/utils";
import { History, PiggyBank } from "lucide-react";
import { SavingsBoard } from "./_components/SavingsBoard";
import {
  getCompletedCellSet,
  getTotalCells,
  SavingsProvider,
  useSavingsState,
} from "./_components/SavingsContext";
import { SavingsForm } from "./_components/SavingsForm";
import { Loading, TabletSplitLayout } from "@/components/ui/PageLayout";

function formatPaidAt(value?: string) {
  if (!value) return "Chưa lưu thời gian";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Chưa lưu thời gian";

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function SavingsHistorySheet() {
  const { rows } = useSavingsState();
  const historyItems = rows.flatMap((row) =>
    Array.from(getCompletedCellSet(row))
      .sort((a, b) => a - b)
      .map((cellNumber) => ({
        id: `${row.id}-${cellNumber}`,
        rowLabel: row.label,
        cellNumber,
        amount: row.period_amount || 0,
        paidAt: row.cell_paid_at?.[String(cellNumber)],
      })),
  ).sort((left, right) => {
    const leftTime = left.paidAt ? new Date(left.paidAt).getTime() : 0;
    const rightTime = right.paidAt ? new Date(right.paidAt).getTime() : 0;

    if (leftTime !== rightTime) return rightTime - leftTime;
    return left.cellNumber - right.cellNumber;
  });

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="rounded-full bg-card/90 shadow-sm backdrop-blur"
          aria-label="Mở lịch sử tích góp"
        >
          <History className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="fixed inset-x-0 bottom-0 top-auto left-0 max-h-[82dvh] w-full max-w-none translate-x-0 translate-y-0 gap-0 overflow-hidden rounded-t-[28px] rounded-b-none border-x-0 border-b-0 p-0 sm:left-[50%] sm:max-w-lg sm:translate-x-[-50%]">
        <DialogHeader className="border-b px-5 pb-4 pt-5 text-left">
          <DialogTitle className="text-xl font-black">Lịch sử tích góp</DialogTitle>
          <DialogDescription>
            {historyItems.length > 0
              ? `${historyItems.length} lần đã tích`
              : "Chưa có lần tích nào."}
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[calc(82dvh-96px)] overflow-y-auto px-5 py-4">
          {historyItems.length === 0 ? (
            <div className="rounded-2xl bg-muted/40 px-4 py-8 text-center text-sm font-semibold text-muted-foreground">
              Chưa có lịch sử tích góp.
            </div>
          ) : (
            <div className="space-y-2">
              {historyItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-3 rounded-2xl border bg-card px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-extrabold text-foreground">
                      {item.rowLabel}
                    </p>
                    <p className="mt-0.5 text-xs font-semibold text-muted-foreground">
                      Ô {item.cellNumber} đã đóng
                    </p>
                    <p className="mt-0.5 text-xs font-semibold text-slate-500">
                      {formatPaidAt(item.paidAt)}
                    </p>
                  </div>
                  <p className="shrink-0 text-sm font-black text-emerald-700 numeric-stable">
                    {formatCurrency(item.amount)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

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
          actions={<SavingsHistorySheet />}
        />

        {error && (
          <p className="rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
            Lỗi: {error}
          </p>
        )}

        <TabletSplitLayout
          sidebar={
            <>
              <Card className="overflow-hidden rounded-[24px] border-0 bg-card/95 py-0 shadow-[0_14px_35px_rgba(15,23,42,0.10)] backdrop-blur">
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
            </>
          }
        >
          {loading ? <Loading /> : <SavingsBoard />}
        </TabletSplitLayout>
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
