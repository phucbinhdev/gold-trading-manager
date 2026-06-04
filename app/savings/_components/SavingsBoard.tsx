"use client";

import { Check, Trash2 } from "lucide-react";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils";
import {
  type SavingsRow,
  useSavingsActions,
  useSavingsState,
} from "./SavingsContext";

function parseLocalDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(parseLocalDate(value));
}

function getStatus(row: SavingsRow): { label: string; variant: BadgeProps["variant"] } {
  const remaining = row.remaining_amount || 0;
  if (remaining <= 0) return { label: "Đã đóng", variant: "default" };

  return row.closed
    ? { label: "Đã đóng", variant: "default" }
    : { label: "Đang góp", variant: "outline" };
}

export function SavingsBoard() {
  const { rows } = useSavingsState();
  const { removeRow, toggleClosed } = useSavingsActions();
  const summary = rows.reduce(
    (acc, row) => ({
      remaining: acc.remaining + (row.remaining_amount || 0),
      closed: acc.closed + (row.closed_count || 0),
    }),
    { remaining: 0, closed: 0 },
  );

  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Bảng Tracking</CardTitle>
          <div className="text-xs text-muted-foreground">
            Tổng còn lại: {formatCurrency(summary.remaining)} · Đã đóng:{" "}
            {summary.closed}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <div className="rounded-2xl border border-dashed p-8 text-center">
            <p className="font-semibold">Chưa có khoản tích góp</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Thêm khoản theo form bên trái để theo dõi đóng kỳ.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Khoản</TableHead>
                <TableHead className="text-right">Mệnh giá</TableHead>
                <TableHead className="text-right">Còn lại (kỳ)</TableHead>
                <TableHead className="text-right">Tiền còn lại</TableHead>
                <TableHead className="text-right">Đã đóng</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => {
                const status = getStatus(row);
                return (
                  <TableRow key={row.id}>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <span className="font-semibold">{row.label}</span>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(row.created_at)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(row.period_amount)}
                    </TableCell>
                    <TableCell className="text-right">
                      {row.periods_left.toLocaleString("vi-VN")}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(row.remaining_amount)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-col items-end gap-1">
                        <span className="font-bold">
                          {row.closed_count.toLocaleString("vi-VN")}
                        </span>
                        <Badge variant={status.variant}>{status.label}</Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="icon-xs"
                          aria-label={
                            row.closed
                              ? "Đánh dấu chưa đóng"
                              : "Đánh dấu đã đóng"
                          }
                          onClick={() => toggleClosed(row)}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          aria-label={`Xóa ${row.label}`}
                          onClick={() => removeRow(row.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              <TableRow>
                <TableCell colSpan={4} className="text-right font-semibold">
                  TỔNG CỘNG
                </TableCell>
                <TableCell className="text-right font-bold">
                  {summary.closed.toLocaleString("vi-VN")}
                </TableCell>
                <TableCell />
              </TableRow>
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
