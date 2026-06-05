"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { Resolver, useForm } from "react-hook-form";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { NumericFormat } from "react-number-format";
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
import { toast } from "sonner";
import { useWebHaptics } from "web-haptics/react";

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
  const haptics = useWebHaptics();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema) as unknown as Resolver<FormValues>,
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

      void haptics.trigger("success");
      toast.success("Đã thêm giao dịch thành công!");
      onOpenChange(false);
      form.reset();
      onSuccess?.();
    } catch (error) {
      console.error(error);
      void haptics.trigger("error");
      toast.error("Lỗi khi thêm giao dịch");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl">Thêm Giao Dịch Mua Vàng</DialogTitle>
          <DialogDescription className="text-base">
            Nhập thông tin mua vàng của bạn. Lưu ý: 1 Chỉ = 10 Phân.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="transaction_date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel className="text-base">Ngày giao dịch</FormLabel>
                  <DatePicker date={field.value} setDate={field.onChange} />
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 gap-6">
              <FormField
                control={form.control}
                name="amount_chi"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base">Số lượng (Chỉ)</FormLabel>
                    <FormControl>
                      <NumericFormat
                        customInput={Input}
                        thousandSeparator="."
                        decimalSeparator=","
                        decimalScale={2}
                        fixedDecimalScale={false}
                        allowNegative={false}
                        placeholder="Ví dụ: 2,5"
                        className="h-12 text-lg"
                        value={field.value}
                        onValueChange={(values) => {
                          field.onChange(values.floatValue);
                        }}
                        onBlur={field.onBlur}
                        name={field.name}
                        getInputRef={field.ref}
                        inputMode="decimal"
                      />
                    </FormControl>
                    <FormDescription>Ví dụ: 1,5 (1 chỉ 5 phân)</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="price_per_chi"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base">
                      Giá mua (VNĐ/Chỉ)
                    </FormLabel>
                    <FormControl>
                      <NumericFormat
                        customInput={Input}
                        thousandSeparator="."
                        decimalSeparator=","
                        decimalScale={0}
                        allowNegative={false}
                        placeholder="7.500.000"
                        className="h-12 text-lg"
                        value={field.value}
                        onValueChange={(values) => {
                          field.onChange(values.floatValue);
                        }}
                        onBlur={field.onBlur}
                        name={field.name}
                        getInputRef={field.ref}
                        inputMode="decimal"
                      />
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
                  <FormLabel className="text-base">
                    Ghi chú (Tùy chọn)
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ví dụ: Mua tặng mẹ..."
                      className="h-12 text-lg"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="mt-4">
              <Button
                type="submit"
                disabled={loading}
                data-haptic="success"
                className="w-full bg-primary text-primary-foreground h-12 text-lg font-semibold"
              >
                {loading && (
                  <Loader2 className="mr-2 h-5 w-5 animate-spin text-primary-foreground" />
                )}
                Lưu Giao Dịch
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
