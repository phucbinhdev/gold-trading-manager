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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { formatCurrency, formatGoldWeight, cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase/client";
import { Database } from "@/lib/supabase/types";

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
      toast.success("Đã xóa giao dịch");
      onUpdate();
    } catch (error) {
      console.error(error);
      toast.error("Không thể xóa giao dịch");
    }
  };

  const handleExport = () => {
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
      <div className="flex justify-between items-center px-1">
        <h3 className="text-lg font-bold text-foreground">Lịch Sử Giao Dịch</h3>
        <div className="flex items-center gap-2">
          {/* Year Filter */}
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-[100px] h-8 text-xs">
              <SelectValue placeholder="Năm" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả</SelectItem>
              {years.map((year) => (
                <SelectItem key={year} value={year}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleExport}
            className="text-muted-foreground hover:text-foreground"
          >
            <Download className="mr-2 h-4 w-4" /> Xuất Excel
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {filteredTransactions.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground bg-muted/30 rounded-xl">
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
                className="relative bg-card rounded-xl border border-border/50 p-4 shadow-sm flex justify-between items-center group"
              >
                {/* Left: Info */}
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "h-10 w-10 rounded-full flex items-center justify-center bg-muted",
                      isProfit
                        ? "bg-green-500/10 text-green-600"
                        : "bg-red-500/10 text-red-600",
                    )}
                  >
                    {/* We can use an icon based on Buy/Sell if we had that info, for now assume all are BUYS so arrow down? Or just Trend arrow */}
                    {isProfit ? (
                      <div className="text-lg">↗</div>
                    ) : (
                      <div className="text-lg">↘</div>
                    )}
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{t.amount_chi} Chỉ</p>
                    <p className="text-xs text-muted-foreground">
                      {format(parseISO(t.transaction_date), "dd/MM/yyyy")}
                    </p>
                  </div>
                </div>

                {/* Right: Profit/Value context */}
                <div className="text-right">
                  <p className="font-bold text-sm">
                    {formatCurrency(totalCost)}
                  </p>
                  <p
                    className={cn(
                      "text-xs font-medium",
                      isProfit ? "text-green-600" : "text-red-600",
                    )}
                  >
                    {isProfit ? "+" : ""}
                    {formatCurrency(profit)}
                  </p>
                </div>

                {/* Actions */}
                <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground hover:text-destructive"
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
