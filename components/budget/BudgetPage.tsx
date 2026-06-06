"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { addMonths, format, subMonths } from "date-fns";
import { vi } from "date-fns/locale";
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Loader2,
  Pencil,
  Plus,
  Wallet,
} from "lucide-react";
import { NumericFormat, type NumberFormatValues } from "react-number-format";
import { toast } from "sonner";
import { useWebHaptics } from "web-haptics/react";

import { ExpenseItem } from "./ExpenseItem";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState, Loading } from "@/components/ui/PageLayout";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/PageHeader";
import { supabase } from "@/lib/supabase/client";
import { Database } from "@/lib/supabase/types";
import { cn, formatCurrency } from "@/lib/utils";

type BudgetMonth = Database["public"]["Tables"]["budget_months"]["Row"];
type BudgetSource = Database["public"]["Tables"]["budget_sources"]["Row"];
type Expense = Database["public"]["Tables"]["budget_expenses"]["Row"];

const DEFAULT_SOURCE_NAME = "Nguồn chính";

export function BudgetPage() {
  const haptics = useWebHaptics();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [sources, setSources] = useState<BudgetSource[]>([]);
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);
  const [budget, setBudget] = useState<BudgetMonth | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingSources, setLoadingSources] = useState(true);
  const [showMoney, setShowMoney] = useState(false);

  const [newExpenseName, setNewExpenseName] = useState("");
  const [newExpenseAmount, setNewExpenseAmount] = useState<number | "">("");
  const [newExpenseNote, setNewExpenseNote] = useState("");
  const [isAddingExpense, setIsAddingExpense] = useState(false);

  const [isSourceDialogOpen, setIsSourceDialogOpen] = useState(false);
  const [newSourceName, setNewSourceName] = useState("");
  const [isAddingSource, setIsAddingSource] = useState(false);
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
  const [renameSourceName, setRenameSourceName] = useState("");
  const [isRenamingSource, setIsRenamingSource] = useState(false);

  const monthKey = format(currentMonth, "yyyy-MM");
  const selectedSource = sources.find((source) => source.id === selectedSourceId) || null;

  const loadSources = useCallback(async () => {
    setLoadingSources(true);

    try {
      const { data, error } = await supabase
        .from("budget_sources")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });

      if (error) throw error;

      let nextSources = data || [];

      if (nextSources.length === 0) {
        const { data: defaultSource, error: createError } = await supabase
          .from("budget_sources")
          .insert({
            name: DEFAULT_SOURCE_NAME,
            sort_order: 0,
            is_active: true,
          })
          .select()
          .single();

        if (createError) throw createError;
        nextSources = defaultSource ? [defaultSource] : [];
      }

      setSources(nextSources);
      setSelectedSourceId((current) => {
        if (current && nextSources.some((source) => source.id === current)) {
          return current;
        }

        return nextSources[0]?.id || null;
      });
    } catch (error) {
      console.error("Error loading budget sources:", error);
      toast.error("Lỗi tải nguồn tiền");
    } finally {
      setLoadingSources(false);
    }
  }, []);

  const fetchBudgetMonth = useCallback(
    async (sourceId: string) => {
      const { data, error } = await supabase
        .from("budget_months")
        .select("*")
        .eq("month_key", monthKey)
        .eq("source_id", sourceId)
        .maybeSingle();

      if (error && error.code !== "PGRST116") {
        throw error;
      }

      if (data) return data;

      const { data: newBudget, error: createError } = await supabase
        .from("budget_months")
        .insert({
          month_key: monthKey,
          source_id: sourceId,
          total_income: 0,
        })
        .select()
        .single();

      if (createError) {
        if (createError.code === "23505") {
          const { data: existingBudget, error: reloadError } = await supabase
            .from("budget_months")
            .select("*")
            .eq("month_key", monthKey)
            .eq("source_id", sourceId)
            .single();

          if (reloadError) throw reloadError;
          return existingBudget;
        }

        throw createError;
      }

      return newBudget;
    },
    [monthKey],
  );

  const loadBudgetData = useCallback(async () => {
    if (!selectedSourceId) {
      setBudget(null);
      setExpenses([]);
      return;
    }

    setLoading(true);

    try {
      const currentBudget = await fetchBudgetMonth(selectedSourceId);
      setBudget(currentBudget);

      if (!currentBudget) {
        setExpenses([]);
        return;
      }

      const { data: expensesData, error: expensesError } = await supabase
        .from("budget_expenses")
        .select("*")
        .eq("budget_id", currentBudget.id)
        .order("created_at", { ascending: true });

      if (expensesError) throw expensesError;
      setExpenses(expensesData || []);
    } catch (error) {
      console.error("Error loading budget data:", error);
      toast.error("Lỗi tải dữ liệu");
    } finally {
      setLoading(false);
    }
  }, [fetchBudgetMonth, selectedSourceId]);

  useEffect(() => {
    loadSources();
  }, [loadSources]);

  useEffect(() => {
    loadBudgetData();
  }, [loadBudgetData]);

  const calculations = useMemo(() => {
    const totalIncome = budget?.total_income || 0;
    const totalDeducted = expenses.reduce((sum, item) => {
      if (item.is_paid || item.is_selected) {
        return sum + item.amount;
      }

      return sum;
    }, 0);
    const remaining = totalIncome - totalDeducted;

    return { totalIncome, totalDeducted, remaining };
  }, [budget, expenses]);

  const handleIncomeChange = async (values: NumberFormatValues) => {
    if (!budget) return;

    const value = values.floatValue || 0;
    setBudget((prev) => (prev ? { ...prev, total_income: value } : null));

    const { error } = await supabase
      .from("budget_months")
      .update({ total_income: value })
      .eq("id", budget.id);

    if (error) {
      console.error("Error updating budget income:", error);
      toast.error("Không thể cập nhật tiền hiện có");
    }
  };

  const handleAddExpense = async () => {
    if (!newExpenseName || newExpenseAmount === "" || !budget) return;

    setIsAddingExpense(true);

    const { data, error } = await supabase
      .from("budget_expenses")
      .insert({
        budget_id: budget.id,
        name: newExpenseName,
        amount: Number(newExpenseAmount),
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
      setExpenses((current) => [...current, data]);
      setNewExpenseName("");
      setNewExpenseAmount("");
      setNewExpenseNote("");
      void haptics.trigger("success");
      toast.success("Đã thêm khoản chi");
    }

    setIsAddingExpense(false);
  };

  const handleAddSource = async () => {
    const name = newSourceName.trim();
    if (!name) return;

    setIsAddingSource(true);

    const { data, error } = await supabase
      .from("budget_sources")
      .insert({
        name,
        sort_order: sources.length,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      void haptics.trigger("error");
      toast.error("Không thể thêm nguồn tiền");
    } else {
      setSources((current) => [...current, data]);
      setSelectedSourceId(data.id);
      setNewSourceName("");
      setIsSourceDialogOpen(false);
      void haptics.trigger("success");
      toast.success("Đã thêm nguồn tiền");
    }

    setIsAddingSource(false);
  };

  const openRenameSourceDialog = () => {
    if (!selectedSource) return;
    setRenameSourceName(selectedSource.name);
    setIsRenameDialogOpen(true);
  };

  const handleRenameSource = async () => {
    if (!selectedSource) return;

    const name = renameSourceName.trim();
    if (!name) return;

    setIsRenamingSource(true);

    const { data, error } = await supabase
      .from("budget_sources")
      .update({ name })
      .eq("id", selectedSource.id)
      .select()
      .single();

    if (error) {
      void haptics.trigger("error");
      toast.error("Không thể đổi tên nguồn tiền");
    } else {
      setSources((current) =>
        current.map((source) => (source.id === data.id ? data : source)),
      );
      setRenameSourceName("");
      setIsRenameDialogOpen(false);
      void haptics.trigger("success");
      toast.success("Đã đổi tên nguồn tiền");
    }

    setIsRenamingSource(false);
  };

  const toggleSelect = async (id: string, currentSelected: boolean) => {
    void haptics.trigger("selection");
    setExpenses((prev) =>
      prev.map((expense) =>
        expense.id === id
          ? { ...expense, is_selected: !currentSelected }
          : expense,
      ),
    );

    const { error } = await supabase
      .from("budget_expenses")
      .update({ is_selected: !currentSelected })
      .eq("id", id);

    if (error) {
      console.error("Error toggling expense selection:", error);
      toast.error("Không thể cập nhật khoản chi");
      loadBudgetData();
    }
  };

  const togglePaid = async (id: string, currentPaid: boolean) => {
    setExpenses((prev) =>
      prev.map((expense) =>
        expense.id === id ? { ...expense, is_paid: !currentPaid } : expense,
      ),
    );

    const { error } = await supabase
      .from("budget_expenses")
      .update({ is_paid: !currentPaid })
      .eq("id", id);

    if (error) {
      console.error("Error toggling expense paid state:", error);
      void haptics.trigger("error");
      toast.error("Không thể cập nhật khoản chi");
      loadBudgetData();
      return;
    }

    if (!currentPaid) {
      void haptics.trigger("success");
      toast.success("Đã đánh dấu hoàn thành!");
    } else {
      void haptics.trigger("selection");
    }
  };

  const deleteExpense = async (id: string) => {
    const previousExpenses = expenses;

    void haptics.trigger("warning");
    setExpenses((prev) => prev.filter((expense) => expense.id !== id));

    const { error } = await supabase.from("budget_expenses").delete().eq("id", id);

    if (error) {
      console.error("Error deleting expense:", error);
      setExpenses(previousExpenses);
      toast.error("Không thể xóa khoản chi");
      return;
    }

    toast.success("Đã xóa khoản chi");
  };

  return (
    <div className="page-shell app-container space-y-6">
      <PageHeader
        title="Tính nợ"
        subtitle="Quản lý chi tiêu hàng tháng"
        icon={<Wallet className="w-6 h-6" />}
        iconColor="bg-gradient-to-br from-indigo-500 to-purple-600"
        showSettings
      />

      <div className="grid gap-6 md:grid-cols-[minmax(20rem,24rem)_1fr] md:items-start">
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-2xl border bg-card p-2 shadow-sm">
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
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Ngân sách tháng
              </p>
              <p className="text-lg font-bold capitalize text-foreground">
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

          <section className="rounded-3xl border bg-card p-3 shadow-sm">
            <div className="mb-3 flex items-center justify-between px-1">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Nguồn tiền
                </p>
                <p className="text-sm font-semibold text-foreground">
                  {selectedSource?.name || "Chưa chọn nguồn"}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={openRenameSourceDialog}
                  aria-label="Đổi tên nguồn tiền"
                  disabled={!selectedSource}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="secondary"
                  size="icon"
                  onClick={() => setIsSourceDialogOpen(true)}
                  aria-label="Thêm nguồn tiền"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {loadingSources ? (
              <div className="h-12 animate-pulse rounded-2xl bg-muted/60" />
            ) : (
              <div
                role="tablist"
                aria-label="Nguồn tiền"
                className="flex gap-2 overflow-x-auto pb-1"
              >
                {sources.map((source) => {
                  const active = source.id === selectedSourceId;

                  return (
                    <button
                      key={source.id}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => {
                        void haptics.trigger("selection");
                        setSelectedSourceId(source.id);
                      }}
                      className={cn(
                        "min-h-11 shrink-0 rounded-2xl border px-4 text-sm font-bold transition",
                        active
                          ? "border-indigo-300 bg-indigo-600 text-white shadow-lg shadow-indigo-500/20"
                          : "border-border bg-background text-muted-foreground hover:bg-muted/70 hover:text-foreground",
                      )}
                    >
                      {source.name}
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-500 to-purple-600 p-6 text-white shadow-xl">
            <div className="absolute top-0 right-0 p-3 opacity-20">
              <div className="h-32 w-32 translate-x-12 -translate-y-12 rounded-full bg-white blur-3xl"></div>
            </div>

            <button
              onClick={() => {
                void haptics.trigger("light");
                setShowMoney(!showMoney);
              }}
              aria-label={showMoney ? "Ẩn số tiền" : "Hiện số tiền"}
              className="absolute top-4 right-4 z-20 rounded-full bg-white/20 p-2 backdrop-blur-sm transition-colors hover:bg-white/30"
            >
              {showMoney ? (
                <Eye className="w-5 h-5 text-indigo-100" />
              ) : (
                <EyeOff className="w-5 h-5 text-indigo-100" />
              )}
            </button>

            <div className="relative z-10 space-y-4">
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-indigo-100">
                  Tiền hiện có
                </p>
                {showMoney ? (
                  <NumericFormat
                    value={calculations.totalIncome}
                    onValueChange={handleIncomeChange}
                    thousandSeparator="."
                    decimalSeparator=","
                    className="w-full bg-transparent text-3xl font-bold text-white placeholder-white/50 focus:outline-none"
                    placeholder="0"
                    inputMode="decimal"
                    disabled={!budget}
                  />
                ) : (
                  <p
                    className="cursor-pointer text-3xl font-bold text-white"
                    onClick={() => {
                      void haptics.trigger("light");
                      setShowMoney(true);
                    }}
                  >
                    ******
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 border-t border-white/20 pt-4">
                <div>
                  <p className="text-[10px] font-semibold uppercase text-indigo-100">
                    Dự kiến chi
                  </p>
                  <p className="text-lg font-semibold">
                    {showMoney
                      ? formatCurrency(calculations.totalDeducted)
                      : "******"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-semibold uppercase text-indigo-100">
                    Còn lại
                  </p>
                  <p className="text-xl font-bold">
                    {showMoney ? formatCurrency(calculations.remaining) : "******"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3 rounded-3xl border border-dashed border-muted-foreground/30 bg-muted/30 p-3 md:p-4">
            <Input
              placeholder={`Tên khoản chi cho ${selectedSource?.name || "nguồn này"}`}
              value={newExpenseName}
              onChange={(e) => setNewExpenseName(e.target.value)}
              className="h-12 w-full bg-background text-lg"
            />
            <Input
              placeholder="Ghi chú (tùy chọn)"
              value={newExpenseNote}
              onChange={(e) => setNewExpenseNote(e.target.value)}
              className="h-10 w-full bg-background text-sm"
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
                className="h-12 flex-1 bg-background text-lg font-medium"
                inputMode="decimal"
              />
              <Button
                onClick={handleAddExpense}
                disabled={
                  isAddingExpense ||
                  !newExpenseName ||
                  newExpenseAmount === "" ||
                  !budget
                }
                size="icon"
                data-haptic="success"
                className="h-12 w-12 shrink-0 bg-indigo-600 shadow-lg hover:bg-indigo-700"
              >
                {isAddingExpense ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Plus className="h-6 w-6" />
                )}
              </Button>
            </div>
          </div>
        </div>

        <div className="min-w-0 space-y-3">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-lg font-bold text-foreground">
                {selectedSource?.name || "Nguồn tiền"}
              </p>
              <p className="text-sm font-semibold text-muted-foreground">
                Danh sách chi tiêu
              </p>
            </div>
            <span className="rounded-full bg-muted px-3 py-1 text-xs font-bold text-muted-foreground">
              {expenses.length} khoản
            </span>
          </div>

          {loading ? (
            <Loading className="py-2" />
          ) : expenses.length === 0 ? (
            <EmptyState
              title="Chưa có khoản chi nào"
              description="Thêm khoản chi đầu tiên để tính nhanh số tiền còn lại cho nguồn này."
              icon={<Wallet className="h-7 w-7" />}
            />
          ) : (
            <div className="grid gap-3 lg:grid-cols-2">
              {expenses.map((expense) => (
                <ExpenseItem
                  key={expense.id}
                  expense={expense}
                  onToggleSelect={toggleSelect}
                  onTogglePaid={togglePaid}
                  onDelete={deleteExpense}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="w-full px-8 pb-4 text-center text-xs text-muted-foreground opacity-70">
        Mỗi nguồn tiền là một tab riêng. Khoản chi chỉ thuộc tab đang chọn.
      </div>

      <Dialog open={isSourceDialogOpen} onOpenChange={setIsSourceDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Thêm nguồn tiền</DialogTitle>
            <DialogDescription>
              Nguồn mới sẽ có ngân sách và danh sách khoản chi riêng cho từng tháng.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Input
              autoFocus
              placeholder="Ví dụ: Lương, Ví riêng, Tài khoản phụ"
              value={newSourceName}
              onChange={(event) => setNewSourceName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  handleAddSource();
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsSourceDialogOpen(false)}
            >
              Hủy
            </Button>
            <Button
              type="button"
              onClick={handleAddSource}
              disabled={isAddingSource || !newSourceName.trim()}
            >
              {isAddingSource && <Loader2 className="h-4 w-4 animate-spin" />}
              Thêm nguồn
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isRenameDialogOpen} onOpenChange={setIsRenameDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Đổi tên nguồn tiền</DialogTitle>
            <DialogDescription>
              Tên mới sẽ áp dụng cho tab này ở tất cả các tháng.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Input
              autoFocus
              placeholder="Tên nguồn tiền"
              value={renameSourceName}
              onChange={(event) => setRenameSourceName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  handleRenameSource();
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsRenameDialogOpen(false)}
            >
              Hủy
            </Button>
            <Button
              type="button"
              onClick={handleRenameSource}
              disabled={isRenamingSource || !renameSourceName.trim()}
            >
              {isRenamingSource && <Loader2 className="h-4 w-4 animate-spin" />}
              Lưu tên
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
