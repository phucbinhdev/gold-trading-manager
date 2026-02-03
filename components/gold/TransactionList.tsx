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
} from "@/components/ui/alert-dialog"; // Need to add alert-dialog if missing

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
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-foreground">
          Lịch Sử Giao Dịch
        </h3>
        <Button variant="outline" size="sm" onClick={handleExport}>
          <Download className="mr-2 h-4 w-4" /> Xuất Excel
        </Button>
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ngày</TableHead>
              <TableHead>Số lượng</TableHead>
              <TableHead className="text-right">Giá mua / Chỉ</TableHead>
              <TableHead className="text-right hidden md:table-cell">
                Tổng vốn
              </TableHead>
              <TableHead className="text-right">Lời / Lỗ</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center py-8 text-muted-foreground"
                >
                  Chưa có giao dịch nào. Hãy thêm mới!
                </TableCell>
              </TableRow>
            ) : (
              transactions.map((t) => {
                const totalCost =
                  t.total_price || t.amount_chi * t.price_per_chi;
                const currentValue = t.amount_chi * marketPrice;
                const profit = currentValue - totalCost;
                const profitPercent = (profit / totalCost) * 100;

                return (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">
                      {format(parseISO(t.transaction_date), "dd/MM/yyyy")}
                      {t.note && (
                        <div className="text-xs text-muted-foreground truncate max-w-[150px]">
                          {t.note}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="font-semibold">{t.amount_chi} Chỉ</div>
                      <div className="text-xs text-muted-foreground">
                        {formatGoldWeight(t.amount_chi)}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(t.price_per_chi)}
                    </TableCell>
                    <TableCell className="text-right hidden md:table-cell">
                      {formatCurrency(totalCost)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div
                        className={cn(
                          "font-bold",
                          profit >= 0 ? "text-green-600" : "text-red-500",
                        )}
                      >
                        {profit >= 0 ? "+" : ""}
                        {formatCurrency(profit)}
                      </div>
                      <div
                        className={cn(
                          "text-xs",
                          profit >= 0 ? "text-green-600/80" : "text-red-500/80",
                        )}
                      >
                        {profitPercent.toFixed(1)}%
                      </div>
                    </TableCell>
                    <TableCell>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              Xóa giao dịch này?
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              Hành động này không thể hoàn tác.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Hủy</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(t.id)}
                              className="bg-destructive hover:bg-destructive/90"
                            >
                              Xóa
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
