"use client";

import { FormEvent, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { SavingsRowInput } from "./SavingsContext";

type SavingsFormProps = {
  onAdd: (input: SavingsRowInput) => void;
  disabled?: boolean;
};

function toDigits(value: string) {
  return value.replace(/\D/g, "");
}

function formatDigits(value: string) {
  const numeric = toDigits(value);
  if (!numeric) return "";
  return new Intl.NumberFormat("vi-VN").format(Number(numeric));
}

export function SavingsForm({ onAdd, disabled }: SavingsFormProps) {
  const [label, setLabel] = useState("");
  const [periodAmount, setPeriodAmount] = useState("");
  const [periodsLeft, setPeriodsLeft] = useState("");
  const [remainingAmount, setRemainingAmount] = useState("");

  const reset = () => {
    setLabel("");
    setPeriodAmount("");
    setPeriodsLeft("");
    setRemainingAmount("");
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const name = label.trim();
    const period = Number(toDigits(periodAmount));
    const periods = Number(toDigits(periodsLeft));
    const remaining = Number(toDigits(remainingAmount));

    if (!name || period <= 0 || periods <= 0 || remaining <= 0) return;

    onAdd({
      label: name,
      period_amount: period,
      periods_left: periods,
      remaining_amount: remaining,
    });

    reset();
  };

  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle className="text-lg">Thêm khoản tích góp</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="space-y-3" onSubmit={handleSubmit}>
          <Input
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            placeholder="Tên khoản / kỳ"
            className="h-11 bg-background"
          />
          <Input
            value={periodAmount}
            onChange={(event) =>
              setPeriodAmount(formatDigits(event.target.value))
            }
            placeholder="Mệnh giá (đ/kỳ)"
            inputMode="numeric"
            className="h-11 bg-background"
          />
          <Input
            value={periodsLeft}
            onChange={(event) =>
              setPeriodsLeft(formatDigits(event.target.value))
            }
            placeholder="Còn lại (kỳ)"
            inputMode="numeric"
            className="h-11 bg-background"
          />
          <Input
            value={remainingAmount}
            onChange={(event) =>
              setRemainingAmount(formatDigits(event.target.value))
            }
            placeholder="Tiền còn lại (đ)"
            inputMode="numeric"
            className="h-11 bg-background"
          />
          <Button
            type="submit"
            className="h-11 w-full bg-emerald-600 hover:bg-emerald-700"
            disabled={!!disabled}
          >
            <Plus className="h-4 w-4" />
            Thêm
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
