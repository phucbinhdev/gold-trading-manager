"use client";

import { useState } from "react";
import { format, parseISO } from "date-fns";
import { Download, Trash2 } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

import { formatCurrency, formatGoldWeight, cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase/client";
import { Database } from "@/lib/supabase/types";
import { useWebHaptics } from "web-haptics/react";

type Transaction = Database["public"]["Tables"]["transactions"]["Row"];

interface TransactionListProps {
  transactions: Transaction[];
  marketPrice: number;
  onUpdate: () => void;
}

export function TransactionList({
  transactions,
  marketPrice,
  onUpdate,
}: TransactionListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<string>("all");
  const haptics = useWebHaptics();

  // Calculate unique years from transactions
  const years = Array.from(
    new Set(
      transactions.map((t) => format(parseISO(t.transaction_date), "yyyy")),
    ),
  ).sort((a, b) => Number(b) - Number(a));

  // Filter transactions
  const filteredTransactions = transactions.filter((t) => {
    if (selectedYear === "all") return true;
    return format(parseISO(t.transaction_date), "yyyy") === selectedYear;
  });

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("transactions")
        .delete()
        .eq("id", id);
      if (error) throw error;
      void haptics.trigger("success");
      toast.success("Đã xóa giao dịch");
      onUpdate();
    } catch (error) {
      console.error(error);
      void haptics.trigger("error");
      toast.error("Không thể xóa giao dịch");
    }
  };

  const handleExport = () => {
    void haptics.trigger("success");
    const data = transactions.map((t) => ({
      Ngày: format(parseISO(t.transaction_date), "dd/MM/yyyy"),
      "Số lượng (Chỉ)": t.amount_chi,
      "Số lượng (Chữ)": formatGoldWeight(t.amount_chi),
      "Giá mua (VND)": t.price_per_chi,
      "Thành tiền (VND)": t.total_price || t.amount_chi * t.price_per_chi,
      "Ghi chú": t.note || "",
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Transactions");
    XLSX.writeFile(workbook, "LichSuMuaVang.xlsx");
  };

  return (
    <div className="space-y-4 pb-20">
      <div className="flex flex-col gap-4">
        <h3 className="text-lg font-bold text-foreground">Lịch Sử Giao Dịch</h3>

        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          <Button
            variant={selectedYear === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => {
              void haptics.trigger("selection");
              setSelectedYear("all");
            }}
            className="rounded-full px-4 numeric-stable"
          >
            Tất cả
          </Button>
          {years.slice(0, 5).map((year) => (
            <Button
              key={year}
              variant={selectedYear === year ? "default" : "outline"}
              size="sm"
              onClick={() => {
                void haptics.trigger("selection");
                setSelectedYear(year);
              }}
              className="rounded-full px-4 numeric-stable"
            >
              {year}
            </Button>
          ))}

          <Button
            variant="ghost"
            size="icon"
            onClick={handleExport}
            data-haptic="success"
            title="Xuất Excel"
            className="ml-auto shrink-0 text-muted-foreground hover:text-foreground"
          >
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {filteredTransactions.length === 0 ? (
          <div className="rounded-2xl bg-muted/30 py-12 text-center text-muted-foreground ring-1 ring-border/50">
            <div className="flex justify-center mb-2">
              <Download className="h-8 w-8 opacity-20" />
            </div>
            Chưa có giao dịch.
          </div>
        ) : (
          filteredTransactions.map((t) => {
            const totalCost = t.total_price || t.amount_chi * t.price_per_chi;
            const currentValue = t.amount_chi * marketPrice;
            const profit = currentValue - totalCost;
            const isProfit = profit >= 0;

            return (
              <div
                key={t.id}
                className="group relative flex flex-col gap-3 rounded-2xl border border-border/50 bg-card p-4 pr-12 shadow-[0_12px_30px_-24px_rgba(0,0,0,0.45)] transition-[border-color,box-shadow,transform] duration-150 ease-out hover:border-border hover:shadow-[0_18px_42px_-28px_rgba(0,0,0,0.5)] active:scale-[0.99] sm:pr-4 motion-reduce:transition-none motion-reduce:active:scale-100"
              >
                <div className="flex justify-between items-start">
                  {/* Left: Info */}
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted shadow-inner image-outline",
                        isProfit
                          ? "bg-green-500/10 text-green-600"
                          : "bg-red-500/10 text-red-600",
                      )}
                    >
                      {isProfit ? (
                        <div className="text-lg">↗</div>
                      ) : (
                        <div className="text-lg">↘</div>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold numeric-stable">
                          {t.amount_chi} Chỉ
                        </p>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {format(parseISO(t.transaction_date), "dd/MM/yyyy")}
                      </p>
                      {t.note && (
                        <div className="mt-1 flex items-start gap-1">
                          <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap">
                            Ghi chú:
                          </span>
                          <p className="text-xs text-foreground line-clamp-2">
                            {t.note}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: Profit/Value context */}
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold numeric-stable">
                      {formatCurrency(totalCost)}
                    </p>
                    <p
                      className={cn(
                        "text-xs font-medium numeric-stable",
                        isProfit ? "text-green-600" : "text-red-600",
                      )}
                    >
                      {isProfit ? "+" : ""}
                      {formatCurrency(profit)}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="absolute right-2 top-2 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        data-haptic="warning"
                        className="h-10 w-10 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Xóa giao dịch này?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Hành động này không thể hoàn tác.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Hủy</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(t.id)}
                          data-haptic="warning"
                          className="bg-destructive"
                        >
                          Xóa
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
