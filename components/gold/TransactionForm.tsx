"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { CalendarIcon, Loader2, Plus } from "lucide-react";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase/client";
import { DatePicker } from "@/components/ui/date-picker";
import { toast } from "sonner";

// Schema
const formSchema = z.object({
  amount_chi: z.coerce.number().min(0.01, "Số lượng phải lớn hơn 0"),
  price_per_chi: z.coerce.number().min(1000, "Giá phải hợp lệ (VND)"),
  transaction_date: z.date(),
  note: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export function TransactionForm({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}) {
  const [loading, setLoading] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      amount_chi: 0,
      price_per_chi: 0,
      transaction_date: new Date(),
      note: "",
    },
  });

  async function onSubmit(values: FormValues) {
    setLoading(true);
    try {
      const { error } = await supabase.from("transactions").insert({
        amount_chi: values.amount_chi,
        price_per_chi: values.price_per_chi,
        transaction_date: format(values.transaction_date, "yyyy-MM-dd"),
        note: values.note,
      });

      if (error) throw error;

      toast.success("Đã thêm giao dịch thành công!");
      onOpenChange(false);
      form.reset();
      onSuccess?.();
    } catch (error) {
      console.error(error);
      toast.error("Lỗi khi thêm giao dịch");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Thêm Giao Dịch Mua Vàng</DialogTitle>
          <DialogDescription>
            Nhập thông tin mua vàng của bạn. Lưu ý: 1 Chỉ = 10 Phân.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="transaction_date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Ngày giao dịch</FormLabel>
                  <DatePicker date={field.value} setDate={field.onChange} />
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="amount_chi"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Số lượng (Chỉ)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="Ví dụ: 2.5"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>Ví dụ: 1.5 (1 chỉ 5 phân)</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="price_per_chi"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Giá mua (VNĐ/Chỉ)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="7500000" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="note"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ghi chú (Tùy chọn)</FormLabel>
                  <FormControl>
                    <Input placeholder="Ví dụ: Mua tặng mẹ..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-primary text-primary-foreground"
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Lưu Giao Dịch
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
