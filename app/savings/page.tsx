"use client";

import { ArrowLeft, Award, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { SavingsBoard } from "./_components/SavingsBoard";
import {
  getTotalCells,
  SavingsProvider,
  useSavingsState,
} from "./_components/SavingsContext";
import { SavingsForm } from "./_components/SavingsForm";

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
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#d8f4ff_0%,#eefbf2_34%,#f8fafc_70%)] pb-24 text-foreground">
      <div className="mx-auto max-w-5xl space-y-4 px-4 py-5">
        <header className="flex items-center justify-between">
          <Button variant="ghost" size="icon" className="h-12 w-12 rounded-full bg-white/90 shadow-sm">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-black text-slate-900">Tích góp</h1>
          <div className="flex gap-2">
            <Button variant="ghost" size="icon" className="h-11 w-11 rounded-full bg-white/90 shadow-sm" aria-label="Hướng dẫn">
              <HelpCircle className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-11 w-11 rounded-full bg-white/90 shadow-sm" aria-label="Thành tích">
              <Award className="h-5 w-5" />
            </Button>
          </div>
        </header>

        {error && (
          <p className="rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
            Lỗi: {error}
          </p>
        )}

        <Card className="overflow-hidden rounded-[32px] border-0 bg-white/90 shadow-[0_14px_35px_rgba(15,23,42,0.10)] backdrop-blur">
          <CardContent className="p-0">
            <div className="grid gap-4 p-5 sm:grid-cols-[1fr_180px] sm:items-center">
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
              <div className="flex justify-center text-7xl sm:text-8xl">🧰</div>
            </div>

            <div className="grid grid-cols-3 border-t bg-white/80 px-5 py-4 text-sm">
              <div>
                <p className="font-black uppercase text-slate-600">Đã đóng</p>
                <p className="mt-1 text-lg font-black text-emerald-700">{formatCurrency(summary.paid)}</p>
              </div>
              <div className="border-x px-4">
                <p className="font-black uppercase text-slate-600">Còn lại</p>
                <p className="mt-1 text-lg font-black text-orange-600">{formatCurrency(summary.remaining)}</p>
              </div>
              <div className="pl-4">
                <p className="font-black uppercase text-slate-600">Tiến độ</p>
                <p className="mt-1 text-lg font-black text-blue-600">{progress}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <SavingsForm />

        {loading ? (
          <Card className="rounded-[28px] py-10 text-center text-sm text-muted-foreground">
            Đang tải dữ liệu...
          </Card>
        ) : (
          <SavingsBoard />
        )}

        <Card className="overflow-hidden rounded-[28px] border-amber-200 bg-gradient-to-r from-amber-50 to-white shadow-sm">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="text-6xl">🪙</div>
            <div className="flex-1">
              <p className="font-black uppercase text-amber-800">Hoàn thành mục tiêu</p>
              <p className="text-sm text-slate-600">Khi bạn hoàn thành tất cả các ô, phần thưởng đặc biệt đang chờ bạn!</p>
            </div>
            <div className="rounded-2xl bg-white px-4 py-3 text-center shadow-sm">
              <div className="text-3xl">🎁</div>
              <p className="text-xs font-bold text-violet-700">Phần thưởng đặc biệt</p>
              <p className="font-black text-violet-800">{formatCurrency(Math.round(summary.goal * 0.05))}</p>
            </div>
          </CardContent>
        </Card>
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
