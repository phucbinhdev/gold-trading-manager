"use client";

import { useEffect, useState, useMemo } from "react";
import { format, subMonths, addMonths } from "date-fns";
import { vi } from "date-fns/locale";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Loader2,
  Wallet,
  Eye,
  EyeOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState, Loading } from "@/components/ui/PageLayout";
import { NumericFormat, type NumberFormatValues } from "react-number-format";
import { supabase } from "@/lib/supabase/client";
import { Database } from "@/lib/supabase/types";
import { ExpenseItem } from "./ExpenseItem";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";
import { useWebHaptics } from "web-haptics/react";

type BudgetMonth = Database["public"]["Tables"]["budget_months"]["Row"];
type Expense = Database["public"]["Tables"]["budget_expenses"]["Row"];

export function BudgetPage() {
  const haptics = useWebHaptics();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [budget, setBudget] = useState<BudgetMonth | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(false);
  const [showMoney, setShowMoney] = useState(false);

  // New Expense Input
  const [newExpenseName, setNewExpenseName] = useState("");
  const [newExpenseAmount, setNewExpenseAmount] = useState<number | "">("");
  const [newExpenseNote, setNewExpenseNote] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  const monthKey = format(currentMonth, "yyyy-MM");

  // Fetch Data
  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Get Budget for Month
      const { data: budgetData, error: budgetError } = await supabase
        .from("budget_months")
        .select("*")
        .eq("month_key", monthKey)
        .single();

      if (budgetError && budgetError.code !== "PGRST116") {
        console.error("Error fetching budget:", budgetError);
        return;
      }

      let currentBudget = budgetData;

      // Create if not exists
      if (!budgetData) {
        const { data: newBudget, error: createError } = await supabase
          .from("budget_months")
          .insert({
            month_key: monthKey,
            total_income: 0,
          })
          .select()
          .single();

        if (createError) {
          console.error(
            "Error creating budget:",
            JSON.stringify(createError, null, 2),
          );
          toast.error(
            `Lỗi tạo ngân sách: ${createError.message || JSON.stringify(createError)}`,
          );
          return;
        }
        currentBudget = newBudget;
      }

      setBudget(currentBudget);

      // 2. Get Expenses
      if (currentBudget) {
        const { data: expensesData, error: expensesError } = await supabase
          .from("budget_expenses")
          .select("*")
          .eq("budget_id", currentBudget.id)
          .order("created_at", { ascending: true });

        if (expensesError) throw expensesError;
        setExpenses(expensesData || []);
      }
    } catch (error) {
      console.error(error);
      toast.error("Lỗi tải dữ liệu");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [monthKey]);

  // Calculations
  const calculations = useMemo(() => {
    const totalIncome = budget?.total_income || 0;

    // Sum of expenses that are either PAID (always count) or SELECTED (estimated)
    const totalDeducted = expenses.reduce((sum, item) => {
      if (item.is_paid || item.is_selected) {
        return sum + item.amount;
      }
      return sum;
    }, 0);

    const remaining = totalIncome - totalDeducted;

    return { totalIncome, totalDeducted, remaining };
  }, [budget, expenses]);

  // Handlers
  const handleIncomeChange = async (values: NumberFormatValues) => {
    const value = values.floatValue || 0;
    // Optimistic update
    setBudget((prev) => (prev ? { ...prev, total_income: value } : null));

    // Debounce save (simplified by just saving on blur or specific action, but here treating as save on change for simplicity with numeric format?)
    // Actually NumericFormat doesn't debounce well implicitly. Let's just save.
    if (budget) {
      await supabase
        .from("budget_months")
        .update({ total_income: value })
        .eq("id", budget.id);
    }
  };

  const handleAddExpense = async () => {
    if (!newExpenseName || newExpenseAmount === "" || !budget) return;

    setIsAdding(true);
    const amount = Number(newExpenseAmount);

    const { data, error } = await supabase
      .from("budget_expenses")
      .insert({
        budget_id: budget.id,
        name: newExpenseName,
        amount: amount,
        is_selected: true,
        is_paid: false,
        note: newExpenseNote,
      })
      .select()
      .single();

    if (error) {
      void haptics.trigger("error");
      toast.error("Lỗi thêm khoản chi");
    } else {
      setExpenses([...expenses, data]);
      setNewExpenseName("");
      setNewExpenseAmount("");
      setNewExpenseNote("");
      void haptics.trigger("success");
      toast.success("Đã thêm khoản chi");
    }
    setIsAdding(false);
  };

  const toggleSelect = async (id: string, currentSelected: boolean) => {
    void haptics.trigger("selection");
    // Optimistic
    setExpenses((prev) =>
      prev.map((e) =>
        e.id === id ? { ...e, is_selected: !currentSelected } : e,
      ),
    );

    await supabase
      .from("budget_expenses")
      .update({ is_selected: !currentSelected })
      .eq("id", id);
  };

  const togglePaid = async (id: string, currentPaid: boolean) => {
    // Optimistic
    setExpenses((prev) =>
      prev.map((e) => (e.id === id ? { ...e, is_paid: !currentPaid } : e)),
    );

    await supabase
      .from("budget_expenses")
      .update({ is_paid: !currentPaid })
      .eq("id", id);
    if (!currentPaid) {
      void haptics.trigger("success");
      toast.success("Đã đánh dấu hoàn thành!");
    } else {
      void haptics.trigger("selection");
    }
  };

  const deleteExpense = async (id: string) => {
    void haptics.trigger("warning");
    setExpenses((prev) => prev.filter((e) => e.id !== id));
    await supabase.from("budget_expenses").delete().eq("id", id);
    toast.success("Đã xóa khoản chi");
  };

  return (
    <div className="page-shell mx-auto max-w-md space-y-6">
      <PageHeader 
        title="Tính nợ" 
        subtitle="Quản lý chi tiêu hàng tháng"
        icon={<Wallet className="w-6 h-6" />}
        iconColor="bg-gradient-to-br from-indigo-500 to-purple-600"
        showSettings
      />

      {/* Month Selector */}
      <div className="flex items-center justify-between bg-card p-2 rounded-2xl shadow-sm border">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            void haptics.trigger("selection");
            setCurrentMonth(subMonths(currentMonth, 1));
          }}
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div className="text-center">
          <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">
            Ngân sách tháng
          </p>
          <p className="text-lg font-bold text-foreground capitalize">
            {format(currentMonth, "MMMM - yyyy", { locale: vi })}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            void haptics.trigger("selection");
            setCurrentMonth(addMonths(currentMonth, 1));
          }}
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      {/* Summary Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-500 to-purple-600 p-6 text-white shadow-xl">
        <div className="absolute top-0 right-0 p-3 opacity-20">
          <div className="h-32 w-32 bg-white rounded-full blur-3xl translate-x-12 -translate-y-12"></div>
        </div>

        <button
          onClick={() => {
            void haptics.trigger("light");
            setShowMoney(!showMoney);
          }}
          aria-label={showMoney ? "Ẩn số tiền" : "Hiện số tiền"}
          className="absolute top-4 right-4 p-2 rounded-full bg-white/20 backdrop-blur-sm hover:bg-white/30 transition-colors z-20"
        >
          {showMoney ? (
            <Eye className="w-5 h-5 text-indigo-100" />
          ) : (
            <EyeOff className="w-5 h-5 text-indigo-100" />
          )}
        </button>

        <div className="relative z-10 space-y-4">
          <div>
            <p className="text-indigo-100 text-xs font-semibold uppercase tracking-wider mb-1">
              Tiền hiện có
            </p>
            {showMoney ? (
              <NumericFormat
                value={calculations.totalIncome}
                onValueChange={handleIncomeChange}
                thousandSeparator="."
                decimalSeparator=","
                className="bg-transparent text-3xl font-bold text-white placeholder-white/50 focus:outline-none w-full"
                placeholder="0"
                inputMode="decimal"
              />
            ) : (
              <p
                className="text-3xl font-bold text-white cursor-pointer"
                onClick={() => {
                  void haptics.trigger("light");
                  setShowMoney(true);
                }}
              >
                ******
              </p>
            )}
          </div>

          <div className="pt-4 border-t border-white/20 grid grid-cols-2 gap-4">
            <div>
              <p className="text-indigo-100 text-[10px] font-semibold uppercase">
                Dự kiến chi
              </p>
              <p className="text-lg font-semibold">
                {showMoney
                  ? formatCurrency(calculations.totalDeducted)
                  : "******"}
              </p>
            </div>
            <div className="text-right">
              <p className="text-indigo-100 text-[10px] font-semibold uppercase">
                Còn lại
              </p>
              <p className="text-xl font-bold">
                {showMoney ? formatCurrency(calculations.remaining) : "******"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Add Expense Form */}
      <div className="space-y-3 rounded-3xl border border-dashed border-muted-foreground/30 bg-muted/30 p-3">
        <Input
          placeholder="Tên khoản chi (vd: Tiền nhà)"
          value={newExpenseName}
          onChange={(e) => setNewExpenseName(e.target.value)}
          className="w-full bg-background h-12 text-lg"
        />
        <Input
          placeholder="Ghi chú (tùy chọn)"
          value={newExpenseNote}
          onChange={(e) => setNewExpenseNote(e.target.value)}
          className="w-full bg-background h-10 text-sm"
        />
        <div className="flex gap-3">
          <NumericFormat
            customInput={Input}
            placeholder="Số tiền"
            value={newExpenseAmount}
            onValueChange={(values) => {
              setNewExpenseAmount(
                values.floatValue === undefined ? "" : values.floatValue,
              );
            }}
            thousandSeparator="."
            decimalSeparator=","
            className="flex-1 bg-background h-12 text-lg font-medium"
            inputMode="decimal"
          />
          <Button
            onClick={handleAddExpense}
            disabled={isAdding || !newExpenseName || newExpenseAmount === ""}
            size="icon"
            data-haptic="success"
            className="h-12 w-12 shrink-0 bg-indigo-600 hover:bg-indigo-700 shadow-lg"
          >
            {isAdding ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Plus className="h-6 w-6" />
            )}
          </Button>
        </div>
      </div>

      {/* Expenses List */}
      <div className="space-y-3">
        <p className="text-sm font-semibold text-muted-foreground ml-1">
          Danh sách chi tiêu
        </p>

        {loading ? (
          <Loading className="py-2" />
        ) : expenses.length === 0 ? (
          <EmptyState
            title="Chưa có khoản chi nào"
            description="Thêm khoản chi đầu tiên để tính nhanh số tiền còn lại trong tháng."
            icon={<Wallet className="h-7 w-7" />}
          />
        ) : (
          expenses.map((expense) => (
            <ExpenseItem
              key={expense.id}
              expense={expense}
              onToggleSelect={toggleSelect}
              onTogglePaid={togglePaid}
              onDelete={deleteExpense}
            />
          ))
        )}
      </div>

      <div className="text-center text-xs text-muted-foreground w-full px-8 pb-4 opacity-70">
        Tip: Nhấn giữ để đánh dấu &quot;Đã chi&quot;. Chạm để chọn/bỏ chọn tính toán.
      </div>
    </div>
  );
}

