"use client";

import { Check, Trash2, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn, formatCurrency } from "@/lib/utils";
import {
  getCompletedCellSet,
  getTotalCells,
  type SavingsRow,
  useSavingsActions,
  useSavingsState,
} from "./SavingsContext";

function WireBadge({ index, completed }: { index: number; completed: boolean }) {
  return (
    <div
      className={cn(
        "relative flex h-20 w-12 shrink-0 flex-col items-center justify-center rounded-t-lg rounded-b-[18px] text-white shadow-sm",
        completed ? "bg-gradient-to-b from-emerald-500 to-emerald-700" : "bg-gradient-to-b from-sky-400 to-blue-600",
      )}
    >
      <span className="text-3xl font-black leading-none">{index}</span>
      <span className="mt-2 text-lg drop-shadow">⭐</span>
      <span className="absolute -bottom-1 h-2 w-8 rounded-full bg-black/10" />
    </div>
  );
}

function CellButton({
  number,
  checked,
  disabled,
  onToggle,
}: {
  number: number;
  checked: boolean;
  disabled: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onToggle}
      aria-label={checked ? `Bỏ đóng ô ${number}` : `Đánh dấu đã đóng ô ${number}`}
      className={cn(
        "flex h-11 w-11 items-center justify-center rounded-full border text-sm font-bold transition active:scale-95 disabled:opacity-60",
        checked
          ? "border-emerald-500 bg-emerald-600 text-white shadow-[0_5px_12px_rgba(22,163,74,0.28)]"
          : "border-slate-200 bg-white text-slate-600 shadow-sm hover:border-emerald-300 hover:text-emerald-700",
      )}
    >
      {checked ? <Check className="h-5 w-5 stroke-[4]" /> : number}
    </button>
  );
}

function SavingsWireCard({ row, index }: { row: SavingsRow; index: number }) {
  const { removeRow, toggleCell } = useSavingsActions();
  const { saving } = useSavingsState();
  const totalCells = getTotalCells(row);
  const completedCells = getCompletedCellSet(row);
  const paidAmount = completedCells.size * (row.period_amount || 0);
  const remainingAmount = Math.max(0, (totalCells - completedCells.size) * (row.period_amount || 0));
  const completed = totalCells > 0 && completedCells.size >= totalCells;

  if (completed) {
    return (
      <Card className="overflow-hidden rounded-[24px] border-0 bg-white/95 shadow-[0_8px_22px_rgba(15,23,42,0.07)]">
        <CardContent className="flex items-center gap-3 p-4">
          <WireBadge index={index} completed />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate text-base font-extrabold text-slate-900">{row.label}</h3>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-black text-emerald-700">
                <Trophy className="h-3.5 w-3.5" />
                Đã Win
              </span>
            </div>
            <p className="mt-1 text-xs font-semibold text-slate-500">
              {completedCells.size} / {totalCells} ô - {formatCurrency(row.period_amount)} / ô
            </p>
            <p className="mt-1 text-sm font-extrabold text-emerald-700">
              Đã đóng {formatCurrency(paidAmount)}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            className="rounded-full text-slate-400 hover:text-destructive"
            aria-label={`Xóa ${row.label}`}
            onClick={() => removeRow(row.id)}
            disabled={saving}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden rounded-[26px] border-0 bg-white/95 shadow-[0_10px_28px_rgba(15,23,42,0.08)]">
      <CardContent className="grid gap-3 p-4 sm:grid-cols-[160px_1fr_145px_auto] sm:items-center sm:gap-4">
        <div className="flex items-center gap-3">
          <WireBadge index={index} completed={completed} />
          <div className="min-w-0">
            <h3 className="truncate text-base font-extrabold text-slate-900">{row.label}</h3>
            <p className="mt-1 text-xs font-semibold text-slate-500">
              {formatCurrency(row.period_amount)} / ô
            </p>
            <div className="mt-2 inline-flex rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-bold text-emerald-700">
              {completedCells.size} / {totalCells} ô đã đóng
            </div>
          </div>
        </div>

        <div className="grid grid-cols-5 justify-items-start gap-x-3 gap-y-3 sm:grid-cols-[repeat(auto-fit,2.75rem)] sm:justify-start">
          {Array.from({ length: totalCells }, (_, cellIndex) => {
            const number = cellIndex + 1;
            const checked = completedCells.has(number);
            return (
              <CellButton
                key={number}
                number={number}
                checked={checked}
                disabled={saving}
                onToggle={() => toggleCell(row, number)}
              />
            );
          })}
        </div>

        <div className="grid grid-cols-2 gap-2 border-t border-slate-100 pt-3 text-sm sm:block sm:border-l sm:border-t-0 sm:pl-4 sm:pt-0">
          <div>
            <p className="text-xs font-semibold text-slate-500">Đã đóng</p>
            <p className="font-extrabold text-emerald-700">{formatCurrency(paidAmount)}</p>
          </div>
          <div className="sm:mt-3">
            <p className="text-xs font-semibold text-slate-500">Còn lại</p>
            <p className="font-extrabold text-orange-600">{formatCurrency(remainingAmount)}</p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2">
          <Button
            variant="ghost"
            size="icon-sm"
            className="rounded-full text-slate-400 hover:text-destructive"
            aria-label={`Xóa ${row.label}`}
            onClick={() => removeRow(row.id)}
            disabled={saving}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function SavingsBoard() {
  const { rows } = useSavingsState();

  if (rows.length === 0) {
    return (
      <Card className="rounded-[28px] border-dashed bg-white/85">
        <CardContent className="p-8 text-center">
          <p className="font-semibold">Chưa có dây tích góp</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Thêm dây đầu tiên để bắt đầu tracking từng ô đóng tiền.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {rows.map((row, index) => (
        <SavingsWireCard key={row.id} row={row} index={index + 1} />
      ))}
    </div>
  );
}
