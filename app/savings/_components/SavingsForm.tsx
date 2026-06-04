"use client";

import { FormEvent, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/utils";
import { useSavingsActions, useSavingsState } from "./SavingsContext";

function toDigits(value: string) {
  return value.replace(/\D/g, "");
}

function formatDigits(value: string) {
  const numeric = toDigits(value);
  if (!numeric) return "";
  return new Intl.NumberFormat("vi-VN").format(Number(numeric));
}

export function SavingsForm() {
  const { addRow } = useSavingsActions();
  const { saving, rows } = useSavingsState();
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [periodAmount, setPeriodAmount] = useState("5.000.000");
  const [totalCells, setTotalCells] = useState("20");

  const nextName = useMemo(() => `Dây ${rows.length + 1}`, [rows.length]);
  const previewTotal = Number(toDigits(periodAmount)) * Number(toDigits(totalCells));

  const reset = () => {
    setLabel("");
    setPeriodAmount("5.000.000");
    setTotalCells("20");
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const name = label.trim() || nextName;
    const period = Number(toDigits(periodAmount));
    const cells = Number(toDigits(totalCells));

    if (!name || period <= 0 || cells <= 0) return;

    await addRow({
      label: name,
      period_amount: period,
      total_cells: cells,
    });

    reset();
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          size="icon"
          className="fixed right-5 bottom-24 z-40 h-14 w-14 rounded-full bg-emerald-600 text-white shadow-[0_12px_24px_rgba(5,150,105,0.35)] hover:bg-emerald-700"
          aria-label="Thêm dây tích góp"
        >
          <Plus className="h-7 w-7" />
        </Button>
      </DialogTrigger>

      <DialogContent className="rounded-[28px] border-0 bg-transparent p-0 shadow-none sm:max-w-md">
        <Card className="rounded-[28px] border-emerald-100/80 bg-white shadow-xl">
          <CardHeader className="pb-3 pr-12">
            <CardTitle className="text-base">Thêm dây tích góp</CardTitle>
            <DialogHeader className="sr-only">
              <DialogTitle>Thêm dây tích góp</DialogTitle>
              <DialogDescription>Nhập tên dây, số tiền mỗi ô và tổng số ô.</DialogDescription>
            </DialogHeader>
          </CardHeader>
          <CardContent>
            <form className="space-y-3" onSubmit={handleSubmit}>
              <div className="grid gap-3 sm:grid-cols-3">
                <Input
                  value={label}
                  onChange={(event) => setLabel(event.target.value)}
                  placeholder={nextName}
                  className="h-11 rounded-2xl bg-background"
                />
                <Input
                  value={periodAmount}
                  onChange={(event) =>
                    setPeriodAmount(formatDigits(event.target.value))
                  }
                  placeholder="Số tiền / ô"
                  inputMode="numeric"
                  className="h-11 rounded-2xl bg-background"
                />
                <Input
                  value={totalCells}
                  onChange={(event) => setTotalCells(formatDigits(event.target.value))}
                  placeholder="Tổng số ô"
                  inputMode="numeric"
                  className="h-11 rounded-2xl bg-background"
                />
              </div>

              <div className="flex flex-col gap-3 rounded-2xl bg-emerald-50/80 p-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                <span className="text-muted-foreground">
                  Mục tiêu dây: <b className="text-emerald-700">{formatCurrency(previewTotal || 0)}</b>
                </span>
                <Button
                  type="submit"
                  className="h-11 rounded-2xl bg-emerald-600 px-5 hover:bg-emerald-700"
                  disabled={saving}
                >
                  <Plus className="h-4 w-4" />
                  Thêm dây
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  );
}
