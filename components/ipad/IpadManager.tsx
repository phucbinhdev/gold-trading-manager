"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { format, parseISO } from "date-fns";
import {
  Banknote,
  CheckCircle2,
  ChevronDown,
  CircleDollarSign,
  HandCoins,
  Loader2,
  Pencil,
  Plus,
  Tablet,
  Trash2,
  Undo2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Resolver, useForm } from "react-hook-form";
import { NumericFormat } from "react-number-format";
import { toast } from "sonner";
import * as z from "zod";

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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState, Loading, TabletSplitLayout } from "@/components/ui/PageLayout";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/lib/supabase/client";
import { Database } from "@/lib/supabase/types";
import { cn, formatCurrency } from "@/lib/utils";
import { useWebHaptics } from "web-haptics/react";

type IpadTransaction =
  Database["public"]["Tables"]["ipad_transactions"]["Row"];

type IpadStatus = "importing" | "in_stock" | "sold";

const IPAD_STATUSES = [
  { value: "importing", label: "Đang nhập hàng", shortLabel: "Nhập hàng" },
  { value: "in_stock", label: "Đang lưu kho", shortLabel: "Lưu kho" },
  { value: "sold", label: "Đã bán", shortLabel: "Đã bán" },
] as const satisfies ReadonlyArray<{
  value: IpadStatus;
  label: string;
  shortLabel: string;
}>;

const statusLabels: Record<IpadStatus, string> = {
  importing: "Đang nhập hàng",
  in_stock: "Đang lưu kho",
  sold: "Đã bán",
};

const statusBadgeClass: Record<IpadStatus, string> = {
  importing: "bg-sky-100 text-sky-700 hover:bg-sky-100",
  in_stock: "bg-amber-100 text-amber-700 hover:bg-amber-100",
  sold: "bg-emerald-100 text-emerald-700 hover:bg-emerald-100",
};

const normalizeStatus = (status: string): IpadStatus => {
  if (status === "importing" || status === "sold") return status;
  return "in_stock";
};

const transactionSchema = z.object({
  purchase_date: z.date(),
  status: z.enum(["importing", "in_stock", "sold"]),
  purchase_price: z.coerce.number().min(0, "Giá mua không hợp lệ"),
  extra_cost: z.coerce.number().min(0, "Chi phí không hợp lệ"),
  loan_amount: z.coerce.number().min(0, "Số tiền vay không hợp lệ").optional(),
  selling_price: z.coerce.number().min(0).optional(),
  sale_date: z.date().optional(),
  note: z.string().optional(),
}).refine(
  (values) =>
    values.status !== "sold" ||
    (values.selling_price !== undefined && values.selling_price > 0),
  {
    path: ["selling_price"],
    message: "Nhập giá bán khi chọn trạng thái đã bán",
  },
);

const saleSchema = z.object({
  selling_price: z.coerce.number().min(1, "Nhập giá bán"),
  sale_date: z.date(),
});

type TransactionFormValues = z.infer<typeof transactionSchema>;
type SaleFormValues = z.infer<typeof saleSchema>;

const compactDate = (value: string | null) =>
  value ? format(parseISO(value), "dd/MM/yyyy") : "";

const currentMonthKey = () => format(new Date(), "yyyy-MM");

const monthKeyFromDate = (value: string) => value.slice(0, 7);

const monthLabel = (monthKey: string) => {
  const [year, month] = monthKey.split("-");
  return `Tháng ${Number(month)}/${year}`;
};

const timestamp = (value: string | null) => {
  if (!value) return 0;
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
};

const compareIpadTransactions = (
  left: IpadTransaction,
  right: IpadTransaction,
) => {
  const purchaseDateDiff =
    timestamp(right.purchase_date) - timestamp(left.purchase_date);
  if (purchaseDateDiff !== 0) return purchaseDateDiff;

  const createdAtDiff = timestamp(right.created_at) - timestamp(left.created_at);
  if (createdAtDiff !== 0) return createdAtDiff;

  return left.id.localeCompare(right.id);
};

function moneyInput(onChange: (value?: number) => void) {
  return {
    customInput: Input,
    thousandSeparator: ".",
    decimalSeparator: ",",
    decimalScale: 0,
    allowNegative: false,
    inputMode: "decimal" as const,
    onValueChange: (values: { floatValue?: number }) =>
      onChange(values.floatValue),
  };
}

export function IpadManager() {
  const haptics = useWebHaptics();
  const [transactions, setTransactions] = useState<IpadTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [saleTarget, setSaleTarget] = useState<IpadTransaction | null>(null);
  const [editTarget, setEditTarget] = useState<IpadTransaction | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(currentMonthKey);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionSchema) as unknown as Resolver<TransactionFormValues>,
    defaultValues: {
      purchase_date: new Date(),
      status: "in_stock",
      purchase_price: 0,
      extra_cost: 0,
      loan_amount: undefined,
      note: "",
    },
  });

  const saleForm = useForm<SaleFormValues>({
    resolver: zodResolver(saleSchema) as unknown as Resolver<SaleFormValues>,
    defaultValues: {
      selling_price: 0,
      sale_date: new Date(),
    },
  });

  const editForm = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionSchema) as unknown as Resolver<TransactionFormValues>,
    defaultValues: {
      purchase_date: new Date(),
      status: "in_stock",
      purchase_price: 0,
      extra_cost: 0,
      loan_amount: undefined,
      note: "",
    },
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("ipad_transactions")
        .select("*")
        .order("purchase_date", { ascending: false })
        .order("created_at", { ascending: false })
        .order("id", { ascending: true });

      if (error) throw error;
      setTransactions([...(data || [])].sort(compareIpadTransactions));
    } catch (error) {
      console.error(error);
      toast.error("Không thể tải danh sách iPad");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (!saleTarget) return;
    saleForm.reset({
      selling_price: saleTarget.selling_price || 0,
      sale_date: saleTarget.sale_date ? parseISO(saleTarget.sale_date) : new Date(),
    });
  }, [saleForm, saleTarget]);

  useEffect(() => {
    if (!editTarget) return;
    editForm.reset({
      purchase_date: parseISO(editTarget.purchase_date),
      status: normalizeStatus(editTarget.status),
      purchase_price: editTarget.purchase_price,
      extra_cost: editTarget.extra_cost,
      loan_amount: editTarget.loan_amount,
      selling_price: editTarget.selling_price || undefined,
      sale_date: editTarget.sale_date ? parseISO(editTarget.sale_date) : undefined,
      note: editTarget.note || "",
    });
  }, [editForm, editTarget]);

  const monthOptions = useMemo(() => {
    const months = new Set([currentMonthKey()]);
    transactions.forEach((item) => {
      months.add(monthKeyFromDate(item.purchase_date));
    });

    return Array.from(months).sort((a, b) => b.localeCompare(a));
  }, [transactions]);

  const monthlyTransactions = useMemo(
    () =>
      transactions
        .filter((item) => monthKeyFromDate(item.purchase_date) === selectedMonth)
        .sort(compareIpadTransactions),
    [selectedMonth, transactions],
  );

  const summary = useMemo(
    () =>
      monthlyTransactions.reduce(
        (acc, item) => {
          const status = normalizeStatus(item.status);
          const sold = status === "sold";
          return {
            totalCost: acc.totalCost + item.total_cost,
            totalPurchase: acc.totalPurchase + item.purchase_price,
            totalExtraCost: acc.totalExtraCost + item.extra_cost,
            totalRevenue: acc.totalRevenue + (sold ? item.selling_price || 0 : 0),
            totalProfit: acc.totalProfit + (sold ? item.profit_amount || 0 : 0),
            debtRemaining:
              acc.debtRemaining + (item.debt_paid ? 0 : item.loan_amount),
            debtPaidCount: acc.debtPaidCount + (item.debt_paid ? 1 : 0),
            sellingCount: acc.sellingCount + (sold ? 0 : 1),
            importingCount: acc.importingCount + (status === "importing" ? 1 : 0),
            inStockCount: acc.inStockCount + (status === "in_stock" ? 1 : 0),
            soldCount: acc.soldCount + (sold ? 1 : 0),
          };
        },
        {
          totalCost: 0,
          totalPurchase: 0,
          totalExtraCost: 0,
          totalRevenue: 0,
          totalProfit: 0,
          debtRemaining: 0,
          debtPaidCount: 0,
          sellingCount: 0,
          importingCount: 0,
          inStockCount: 0,
          soldCount: 0,
        },
      ),
    [monthlyTransactions],
  );

  const onSubmit = async (values: TransactionFormValues) => {
    setSaving(true);
    try {
      const sellingPrice = values.selling_price || null;
      const status = sellingPrice ? "sold" : values.status;
      const loanAmount =
        values.loan_amount ?? values.purchase_price + (values.extra_cost || 0);
      const { error } = await supabase.from("ipad_transactions").insert({
        purchase_date: format(values.purchase_date, "yyyy-MM-dd"),
        status,
        device_name: "iPad",
        storage: null,
        color: null,
        serial_number: null,
        purchase_price: values.purchase_price,
        extra_cost: values.extra_cost || 0,
        loan_amount: loanAmount,
        selling_price: sellingPrice,
        sale_date: sellingPrice
          ? format(values.sale_date || new Date(), "yyyy-MM-dd")
          : null,
        note: values.note?.trim() || null,
      });

      if (error) throw error;
      void haptics.trigger("success");
      toast.success("Đã thêm giao dịch iPad");
      setIsAddOpen(false);
      form.reset();
      fetchData();
    } catch (error) {
      console.error(error);
      void haptics.trigger("error");
      toast.error("Không thể lưu giao dịch iPad");
    } finally {
      setSaving(false);
    }
  };

  const onSaleSubmit = async (values: SaleFormValues) => {
    if (!saleTarget) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("ipad_transactions")
        .update({
          selling_price: values.selling_price,
          sale_date: format(values.sale_date, "yyyy-MM-dd"),
          status: "sold",
        })
        .eq("id", saleTarget.id);

      if (error) throw error;
      void haptics.trigger("success");
      toast.success("Đã cập nhật giá bán");
      setSaleTarget(null);
      fetchData();
    } catch (error) {
      console.error(error);
      void haptics.trigger("error");
      toast.error("Không thể cập nhật giá bán");
    } finally {
      setSaving(false);
    }
  };

  const onEditSubmit = async (values: TransactionFormValues) => {
    if (!editTarget) return;

    setSaving(true);
    try {
      const sellingPrice = values.selling_price || null;
      const status = sellingPrice ? "sold" : values.status;
      const loanAmount =
        values.loan_amount ?? values.purchase_price + (values.extra_cost || 0);
      const { error } = await supabase
        .from("ipad_transactions")
        .update({
          purchase_date: format(values.purchase_date, "yyyy-MM-dd"),
          status,
          purchase_price: values.purchase_price,
          extra_cost: values.extra_cost || 0,
          loan_amount: loanAmount,
          selling_price: sellingPrice,
          sale_date: sellingPrice
            ? format(values.sale_date || new Date(), "yyyy-MM-dd")
            : null,
          note: values.note?.trim() || null,
        })
        .eq("id", editTarget.id);

      if (error) throw error;
      void haptics.trigger("success");
      toast.success("Đã cập nhật thông tin nhập hàng");
      setEditTarget(null);
      fetchData();
    } catch (error) {
      console.error(error);
      void haptics.trigger("error");
      toast.error("Không thể cập nhật thông tin nhập hàng");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("ipad_transactions")
        .delete()
        .eq("id", id);

      if (error) throw error;
      void haptics.trigger("success");
      toast.success("Đã xóa giao dịch");
      fetchData();
    } catch (error) {
      console.error(error);
      void haptics.trigger("error");
      toast.error("Không thể xóa giao dịch");
    }
  };

  const handleDebtToggle = async (item: IpadTransaction) => {
    try {
      const nextPaid = !item.debt_paid;
      const { error } = await supabase
        .from("ipad_transactions")
        .update({
          debt_paid: nextPaid,
          debt_paid_at: nextPaid ? new Date().toISOString() : null,
        })
        .eq("id", item.id);

      if (error) throw error;
      void haptics.trigger(nextPaid ? "success" : "selection");
      toast.success(nextPaid ? "Đã đánh dấu trả xong nợ" : "Đã chuyển về còn nợ");
      fetchData();
    } catch (error) {
      console.error(error);
      void haptics.trigger("error");
      toast.error("Không thể cập nhật trạng thái nợ");
    }
  };

  const handleStatusChange = async (item: IpadTransaction, status: IpadStatus) => {
    if (normalizeStatus(item.status) === status) return;

    if (status === "sold" && !item.selling_price) {
      void haptics.trigger("medium");
      setSaleTarget(item);
      return;
    }

    try {
      const resetSale = status !== "sold";
      const { error } = await supabase
        .from("ipad_transactions")
        .update({
          status,
          selling_price: resetSale ? null : item.selling_price,
          sale_date: resetSale ? null : item.sale_date,
        })
        .eq("id", item.id);

      if (error) throw error;
      void haptics.trigger("success");
      toast.success(`Đã chuyển sang ${statusLabels[status].toLowerCase()}`);
      fetchData();
    } catch (error) {
      console.error(error);
      void haptics.trigger("error");
      toast.error("Không thể cập nhật trạng thái iPad");
    }
  };

  const toggleExpanded = (id: string) => {
    setExpandedIds((current) => {
      const next = new Set(current);

      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }

      return next;
    });
  };

  return (
    <div className="page-shell app-container bg-background text-foreground">
      <PageHeader
        title="Mua bán iPad"
        icon={<Tablet className="h-6 w-6 text-white" />}
        iconColor="bg-gradient-to-br from-sky-500 to-emerald-500"
      />

      <TabletSplitLayout
        className="mt-4"
        sidebar={
          <>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {monthOptions.map((month) => (
                <Button
                  key={month}
                  variant={selectedMonth === month ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    void haptics.trigger("selection");
                    setSelectedMonth(month);
                  }}
                  className="shrink-0 rounded-full px-4"
                >
                  {month === currentMonthKey() ? "Tháng này" : monthLabel(month)}
                </Button>
              ))}
            </div>

            <section className="overflow-hidden rounded-2xl bg-slate-950 text-white shadow-xl shadow-slate-950/20 ring-1 ring-white/10">
              <div className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase text-white/60">
                      Lợi nhuận {monthLabel(selectedMonth)}
                    </p>
                    <p
                      className={cn(
                        "mt-2 text-3xl font-bold",
                        summary.totalProfit >= 0 ? "text-emerald-300" : "text-red-300",
                      )}
                    >
                      {summary.totalProfit >= 0 ? "+" : ""}
                      {formatCurrency(summary.totalProfit)}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-white/10 p-3">
                    <CircleDollarSign className="h-6 w-6" />
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-xl bg-white/10 p-3">
                    <p className="text-white/55">Tổng vốn</p>
                    <p className="mt-1 font-bold">{formatCurrency(summary.totalCost)}</p>
                  </div>
                  <div className="rounded-xl bg-white/10 p-3">
                    <p className="text-white/55">Doanh thu bán</p>
                    <p className="mt-1 font-bold">
                      {formatCurrency(summary.totalRevenue)}
                    </p>
                  </div>
                  <div className="rounded-xl bg-white/10 p-3">
                    <p className="text-white/55">Nợ chưa trả</p>
                    <p className="mt-1 font-bold">
                      {formatCurrency(summary.debtRemaining)}
                    </p>
                  </div>
                  <div className="rounded-xl bg-white/10 p-3">
                    <p className="text-white/55">Đã bán</p>
                    <p className="mt-1 font-bold">{summary.soldCount} máy</p>
                  </div>
                </div>
              </div>
            </section>

            <div className="grid grid-cols-2 gap-3">
              <Card className="rounded-2xl py-0">
                <CardContent className="p-4">
                  <Banknote className="h-5 w-5 text-sky-600" />
                  <p className="mt-3 text-xs text-muted-foreground">Tiền mua máy</p>
                  <p className="mt-1 text-sm font-bold">
                    {formatCurrency(summary.totalPurchase)}
                  </p>
                </CardContent>
              </Card>
              <Card className="rounded-2xl py-0">
                <CardContent className="p-4">
                  <HandCoins className="h-5 w-5 text-emerald-600" />
                  <p className="mt-3 text-xs text-muted-foreground">Đã trả nợ</p>
                  <p className="mt-1 text-sm font-bold">
                    {summary.debtPaidCount} máy
                  </p>
                </CardContent>
              </Card>
            </div>
          </>
        }
        contentClassName="space-y-4"
      >
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">Danh sách máy</h2>
            <Button
              onClick={() => {
                void haptics.trigger("medium");
                setIsAddOpen(true);
              }}
              size="sm"
              data-haptic="medium"
            >
              <Plus className="h-4 w-4" />
              Thêm iPad
            </Button>
          </div>

          {loading ? (
            <Loading />
          ) : monthlyTransactions.length === 0 ? (
            <EmptyState
              icon={<Tablet className="h-7 w-7" />}
              title={`Chưa có giao dịch iPad trong ${monthLabel(selectedMonth)}`}
              description="Chọn tháng cũ hoặc thêm giao dịch mới để theo dõi lời lỗ."
            />
          ) : (
            <div className="grid gap-3 xl:grid-cols-2">
            {monthlyTransactions.map((item) => {
              const status = normalizeStatus(item.status);
              const isSold = status === "sold";
              const profit = item.profit_amount || 0;
              const debtPaid = item.debt_paid;
              const expanded = expandedIds.has(item.id);

              return (
                <Card
                  key={item.id}
                  className="rounded-2xl py-0 transition-[border-color,box-shadow] hover:border-border/80"
                  onClick={() => toggleExpanded(item.id)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="truncate font-bold">{item.device_name}</h3>
                          <Badge
                            variant="secondary"
                            className={cn(statusBadgeClass[status])}
                          >
                            {statusLabels[status]}
                          </Badge>
                          <Badge
                            variant={debtPaid ? "secondary" : "destructive"}
                            className={cn(
                              debtPaid
                                ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100"
                                : "bg-red-100 text-red-700 hover:bg-red-100",
                            )}
                          >
                            {debtPaid ? "Đã trả nợ" : "Còn nợ"}
                          </Badge>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Mua ngày {compactDate(item.purchase_date)}
                          {item.storage ? ` · ${item.storage}` : ""}
                          {item.color ? ` · ${item.color}` : ""}
                        </p>
                        {item.serial_number && (
                          <p className="mt-1 text-xs text-muted-foreground">
                            Seri: {item.serial_number}
                          </p>
                        )}
                      </div>

                      <div className="flex shrink-0 items-center gap-1">
                        <ChevronDown
                          className={cn(
                            "h-4 w-4 text-muted-foreground transition-transform",
                            expanded && "rotate-180",
                          )}
                        />
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground">Giá mua</p>
                        <p className="font-semibold">
                          {formatCurrency(item.purchase_price)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Nợ</p>
                        <p
                          className={cn(
                            "font-semibold",
                            debtPaid ? "text-emerald-600" : "text-red-600",
                          )}
                        >
                          {debtPaid ? "Đã trả" : formatCurrency(item.loan_amount)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Lời / lỗ</p>
                        <p
                          className={cn(
                            "font-semibold",
                            !isSold
                              ? "text-muted-foreground"
                              : profit >= 0
                                ? "text-emerald-600"
                                : "text-red-600",
                          )}
                        >
                          {isSold
                            ? `${profit >= 0 ? "+" : ""}${formatCurrency(profit)}`
                            : "Đang chờ"}
                        </p>
                      </div>
                    </div>

                    {item.note && (
                      <p className="mt-3 rounded-xl bg-muted/45 px-3 py-2 text-xs leading-5 text-muted-foreground">
                        {item.note}
                      </p>
                    )}

                    {expanded && (
                      <div
                        className="mt-4 space-y-4 border-t border-border/60 pt-4"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <div className="mx-auto grid w-full max-w-sm grid-cols-3 gap-1 rounded-full bg-muted/70 p-1">
                          {IPAD_STATUSES.map((statusOption) => {
                            const active = status === statusOption.value;

                            return (
                              <button
                                key={statusOption.value}
                                type="button"
                                className={cn(
                                  "inline-flex h-7 items-center justify-center rounded-full px-2 text-[11px] font-semibold text-muted-foreground transition hover:bg-background/80 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
                                  active &&
                                    statusOption.value === "importing" &&
                                    "bg-sky-100 text-sky-700 shadow-sm hover:bg-sky-100 hover:text-sky-700",
                                  active &&
                                    statusOption.value === "in_stock" &&
                                    "bg-amber-100 text-amber-700 shadow-sm hover:bg-amber-100 hover:text-amber-700",
                                  active &&
                                    statusOption.value === "sold" &&
                                    "bg-emerald-100 text-emerald-700 shadow-sm hover:bg-emerald-100 hover:text-emerald-700",
                                )}
                                onClick={() =>
                                  handleStatusChange(item, statusOption.value)
                                }
                              >
                                {statusOption.shortLabel}
                              </button>
                            );
                          })}
                        </div>

                        <div className="text-sm">
                          <p className="text-xs text-muted-foreground">Giá bán</p>
                          <p className="font-semibold">
                            {item.selling_price
                              ? formatCurrency(item.selling_price)
                              : "Chưa bán"}
                          </p>
                        </div>

                        <div className="space-y-1 text-xs text-muted-foreground">
                          {item.sale_date && (
                            <p>Bán ngày {compactDate(item.sale_date)}</p>
                          )}
                          {item.debt_paid_at && (
                            <p>Trả nợ ngày {compactDate(item.debt_paid_at)}</p>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <Button
                            variant="outline"
                            onClick={() => {
                              void haptics.trigger("medium");
                              setEditTarget(item);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                            Sửa nhập hàng
                          </Button>
                          <Button
                            variant={isSold ? "outline" : "default"}
                            onClick={() => {
                              void haptics.trigger("medium");
                              setSaleTarget(item);
                            }}
                          >
                            {isSold ? (
                              <Pencil className="h-4 w-4" />
                            ) : (
                              <CheckCircle2 className="h-4 w-4" />
                            )}
                            {isSold ? "Sửa giá bán" : "Nhập giá bán"}
                          </Button>
                        </div>

                        <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                          <Button
                            variant={debtPaid ? "outline" : "secondary"}
                            data-haptic={debtPaid ? "selection" : "success"}
                            className={cn(
                              !debtPaid &&
                                "bg-emerald-600 text-white shadow-[0_10px_22px_rgba(5,150,105,0.22)] hover:bg-emerald-700 hover:text-white",
                            )}
                            onClick={() => handleDebtToggle(item)}
                          >
                            {debtPaid ? (
                              <Undo2 className="h-4 w-4" />
                            ) : (
                              <HandCoins className="h-4 w-4" />
                            )}
                            {debtPaid ? "Chưa trả nợ" : "Đã trả nợ"}
                          </Button>

                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="secondary"
                                data-haptic="warning"
                                className="bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700"
                              >
                                <Trash2 className="h-4 w-4" />
                                Xóa
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>
                                  Xóa giao dịch iPad?
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  Hành động này không thể hoàn tác.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Hủy</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(item.id)}
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
                      )}
                  </CardContent>
                </Card>
              );
            })}
            </div>
          )}
      </TabletSplitLayout>

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Thêm giao dịch iPad</DialogTitle>
            <DialogDescription>
              Nhập giá mua trước. Nếu đã bán, có thể nhập luôn giá bán.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <FormField
                control={form.control}
                name="purchase_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ngày mua</FormLabel>
                    <DatePicker date={field.value} setDate={field.onChange} />
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Trạng thái</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Chọn trạng thái" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {IPAD_STATUSES.map((status) => (
                          <SelectItem key={status.value} value={status.value}>
                            {status.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="purchase_price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Giá mua</FormLabel>
                      <FormControl>
                        <NumericFormat
                          {...moneyInput(field.onChange)}
                          value={field.value}
                          placeholder="10.000.000"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="extra_cost"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Chi phí</FormLabel>
                      <FormControl>
                        <NumericFormat
                          {...moneyInput(field.onChange)}
                          value={field.value}
                          placeholder="0"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="loan_amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Số tiền vay</FormLabel>
                    <FormControl>
                      <NumericFormat
                        {...moneyInput(field.onChange)}
                        value={field.value}
                        placeholder="Để trống nếu vay bằng tổng giá mua"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="selling_price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Giá bán nếu đã bán</FormLabel>
                    <FormControl>
                      <NumericFormat
                        {...moneyInput(field.onChange)}
                        value={field.value}
                        placeholder="Để trống nếu đang bán"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="sale_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ngày bán</FormLabel>
                    <DatePicker date={field.value} setDate={field.onChange} />
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="note"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ghi chú</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Phụ kiện kèm theo, tình trạng máy..."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="submit" className="w-full" disabled={saving}>
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  Lưu giao dịch
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editTarget} onOpenChange={(open) => !open && setEditTarget(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Sửa thông tin nhập hàng</DialogTitle>
            <DialogDescription>
              Cập nhật ngày mua, giá nhập, chi phí, số tiền vay và ghi chú.
            </DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-5">
              <FormField
                control={editForm.control}
                name="purchase_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ngày mua</FormLabel>
                    <DatePicker date={field.value} setDate={field.onChange} />
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Trạng thái</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Chọn trạng thái" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {IPAD_STATUSES.map((status) => (
                          <SelectItem key={status.value} value={status.value}>
                            {status.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={editForm.control}
                  name="purchase_price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Giá mua</FormLabel>
                      <FormControl>
                        <NumericFormat
                          {...moneyInput(field.onChange)}
                          value={field.value}
                          placeholder="10.000.000"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="extra_cost"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Chi phí</FormLabel>
                      <FormControl>
                        <NumericFormat
                          {...moneyInput(field.onChange)}
                          value={field.value}
                          placeholder="0"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={editForm.control}
                name="loan_amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Số tiền vay</FormLabel>
                    <FormControl>
                      <NumericFormat
                        {...moneyInput(field.onChange)}
                        value={field.value}
                        placeholder="Để trống nếu vay bằng tổng giá mua"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
                name="selling_price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Giá bán nếu đã bán</FormLabel>
                    <FormControl>
                      <NumericFormat
                        {...moneyInput(field.onChange)}
                        value={field.value}
                        placeholder="Để trống nếu đang bán"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
                name="sale_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ngày bán</FormLabel>
                    <DatePicker date={field.value} setDate={field.onChange} />
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
                name="note"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ghi chú</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Người mua, tình trạng nợ..."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="submit" className="w-full" disabled={saving}>
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  Lưu thay đổi
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!saleTarget} onOpenChange={(open) => !open && setSaleTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nhập giá bán</DialogTitle>
            <DialogDescription>
              Sau khi lưu, hệ thống tự tính lời/lỗ và chuyển trạng thái đã bán.
            </DialogDescription>
          </DialogHeader>
          <Form {...saleForm}>
            <form
              onSubmit={saleForm.handleSubmit(onSaleSubmit)}
              className="space-y-5"
            >
              <FormField
                control={saleForm.control}
                name="selling_price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Giá bán</FormLabel>
                    <FormControl>
                      <NumericFormat
                        {...moneyInput(field.onChange)}
                        value={field.value}
                        placeholder="12.000.000"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={saleForm.control}
                name="sale_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ngày bán</FormLabel>
                    <DatePicker date={field.value} setDate={field.onChange} />
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="submit" className="w-full" disabled={saving}>
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  Cập nhật
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
