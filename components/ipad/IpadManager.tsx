"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { format, parseISO } from "date-fns";
import {
  Banknote,
  CheckCircle2,
  CircleDollarSign,
  Loader2,
  Pencil,
  Plus,
  ReceiptText,
  Tablet,
  Trash2,
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
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/lib/supabase/client";
import { Database } from "@/lib/supabase/types";
import { cn, formatCurrency } from "@/lib/utils";

type IpadTransaction =
  Database["public"]["Tables"]["ipad_transactions"]["Row"];

const transactionSchema = z.object({
  purchase_date: z.date(),
  device_name: z.string().min(1, "Nhập tên máy"),
  storage: z.string().optional(),
  color: z.string().optional(),
  serial_number: z.string().optional(),
  purchase_price: z.coerce.number().min(0, "Giá mua không hợp lệ"),
  extra_cost: z.coerce.number().min(0, "Chi phí không hợp lệ"),
  selling_price: z.coerce.number().min(0).optional(),
  sale_date: z.date().optional(),
  note: z.string().optional(),
});

const saleSchema = z.object({
  selling_price: z.coerce.number().min(1, "Nhập giá bán"),
  sale_date: z.date(),
});

type TransactionFormValues = z.infer<typeof transactionSchema>;
type SaleFormValues = z.infer<typeof saleSchema>;

const compactDate = (value: string | null) =>
  value ? format(parseISO(value), "dd/MM/yyyy") : "";

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
  const [transactions, setTransactions] = useState<IpadTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [saleTarget, setSaleTarget] = useState<IpadTransaction | null>(null);

  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionSchema) as unknown as Resolver<TransactionFormValues>,
    defaultValues: {
      purchase_date: new Date(),
      device_name: "",
      storage: "",
      color: "",
      serial_number: "",
      purchase_price: 0,
      extra_cost: 0,
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

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("ipad_transactions")
        .select("*")
        .order("purchase_date", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTransactions(data || []);
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

  const summary = useMemo(
    () =>
      transactions.reduce(
        (acc, item) => {
          const sold = item.status === "sold";
          return {
            totalCost: acc.totalCost + item.total_cost,
            totalPurchase: acc.totalPurchase + item.purchase_price,
            totalExtraCost: acc.totalExtraCost + item.extra_cost,
            totalRevenue: acc.totalRevenue + (item.selling_price || 0),
            totalProfit: acc.totalProfit + (item.profit_amount || 0),
            sellingCount: acc.sellingCount + (sold ? 0 : 1),
            soldCount: acc.soldCount + (sold ? 1 : 0),
          };
        },
        {
          totalCost: 0,
          totalPurchase: 0,
          totalExtraCost: 0,
          totalRevenue: 0,
          totalProfit: 0,
          sellingCount: 0,
          soldCount: 0,
        },
      ),
    [transactions],
  );

  const onSubmit = async (values: TransactionFormValues) => {
    setSaving(true);
    try {
      const sellingPrice = values.selling_price || null;
      const { error } = await supabase.from("ipad_transactions").insert({
        purchase_date: format(values.purchase_date, "yyyy-MM-dd"),
        device_name: values.device_name.trim(),
        storage: values.storage?.trim() || null,
        color: values.color?.trim() || null,
        serial_number: values.serial_number?.trim() || null,
        purchase_price: values.purchase_price,
        extra_cost: values.extra_cost || 0,
        selling_price: sellingPrice,
        sale_date: sellingPrice
          ? format(values.sale_date || new Date(), "yyyy-MM-dd")
          : null,
        note: values.note?.trim() || null,
      });

      if (error) throw error;
      toast.success("Đã thêm giao dịch iPad");
      setIsAddOpen(false);
      form.reset();
      fetchData();
    } catch (error) {
      console.error(error);
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
        })
        .eq("id", saleTarget.id);

      if (error) throw error;
      toast.success("Đã cập nhật giá bán");
      setSaleTarget(null);
      fetchData();
    } catch (error) {
      console.error(error);
      toast.error("Không thể cập nhật giá bán");
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
      toast.success("Đã xóa giao dịch");
      fetchData();
    } catch (error) {
      console.error(error);
      toast.error("Không thể xóa giao dịch");
    }
  };

  return (
    <div className="min-h-screen bg-background px-4 py-6 pb-24 text-foreground">
      <PageHeader
        title="Mua bán iPad"
        subtitle="Theo dõi vốn, doanh thu và lợi nhuận từng máy"
        icon={<Tablet className="h-6 w-6 text-white" />}
        iconColor="bg-gradient-to-br from-sky-500 to-emerald-500"
        showSettings
      />

      <div className="mt-6 space-y-5">
        <Card className="overflow-hidden rounded-2xl border-0 bg-slate-950 py-0 text-white shadow-xl">
          <CardContent className="p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase text-white/60">
                  Lợi nhuận hiện tại
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
                <p className="text-white/55">Đang bán</p>
                <p className="mt-1 font-bold">{summary.sellingCount} máy</p>
              </div>
              <div className="rounded-xl bg-white/10 p-3">
                <p className="text-white/55">Đã bán</p>
                <p className="mt-1 font-bold">{summary.soldCount} máy</p>
              </div>
            </div>
          </CardContent>
        </Card>

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
              <ReceiptText className="h-5 w-5 text-orange-600" />
              <p className="mt-3 text-xs text-muted-foreground">Chi phí phát sinh</p>
              <p className="mt-1 text-sm font-bold">
                {formatCurrency(summary.totalExtraCost)}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Danh sách máy</h2>
          <Button onClick={() => setIsAddOpen(true)} size="sm">
            <Plus className="h-4 w-4" />
            Thêm iPad
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center p-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : transactions.length === 0 ? (
          <Card className="rounded-2xl border-dashed py-0">
            <CardContent className="flex flex-col items-center justify-center p-10 text-center">
              <Tablet className="h-10 w-10 text-muted-foreground/40" />
              <p className="mt-3 font-semibold">Chưa có giao dịch iPad</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Thêm máy đầu tiên để theo dõi lời lỗ.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {transactions.map((item) => {
              const isSold = item.status === "sold";
              const profit = item.profit_amount || 0;

              return (
                <Card key={item.id} className="rounded-2xl py-0">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="truncate font-bold">{item.device_name}</h3>
                          <Badge variant={isSold ? "secondary" : "outline"}>
                            {isSold ? "Đã bán" : "Đang bán"}
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

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Xóa giao dịch iPad?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Hành động này không thể hoàn tác.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Hủy</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(item.id)}
                              className="bg-destructive"
                            >
                              Xóa
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground">Giá mua</p>
                        <p className="font-semibold">
                          {formatCurrency(item.purchase_price)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Chi phí</p>
                        <p className="font-semibold">
                          {formatCurrency(item.extra_cost)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Giá bán</p>
                        <p className="font-semibold">
                          {item.selling_price
                            ? formatCurrency(item.selling_price)
                            : "Chưa bán"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Lời / lỗ</p>
                        <p
                          className={cn(
                            "font-bold",
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

                    {item.sale_date && (
                      <p className="mt-3 text-xs text-muted-foreground">
                        Bán ngày {compactDate(item.sale_date)}
                      </p>
                    )}
                    {item.note && (
                      <p className="mt-3 rounded-xl bg-muted/50 p-3 text-sm">
                        {item.note}
                      </p>
                    )}

                    <Button
                      variant={isSold ? "outline" : "default"}
                      className="mt-4 w-full"
                      onClick={() => setSaleTarget(item)}
                    >
                      {isSold ? (
                        <Pencil className="h-4 w-4" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4" />
                      )}
                      {isSold ? "Sửa giá bán" : "Nhập giá bán"}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

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
                name="device_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tên máy</FormLabel>
                    <FormControl>
                      <Input placeholder="iPad Pro M2 11 inch" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="storage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Dung lượng</FormLabel>
                      <FormControl>
                        <Input placeholder="128GB" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="color"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Màu</FormLabel>
                      <FormControl>
                        <Input placeholder="Space Gray" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="serial_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Seri / IMEI</FormLabel>
                    <FormControl>
                      <Input placeholder="Tùy chọn" {...field} />
                    </FormControl>
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
