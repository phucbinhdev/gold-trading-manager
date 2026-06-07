"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { addMonths, format, subMonths } from "date-fns";
import { vi } from "date-fns/locale";
import {
  ArrowDownLeft,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
  Wallet,
} from "lucide-react";
import { NumericFormat, type NumberFormatValues } from "react-number-format";
import { toast } from "sonner";
import { useWebHaptics } from "web-haptics/react";

import { ExpenseItem } from "./ExpenseItem";
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
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState, Loading, TabletSplitLayout } from "@/components/ui/PageLayout";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/PageHeader";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/lib/supabase/client";
import { Database } from "@/lib/supabase/types";
import { cn, formatCurrency } from "@/lib/utils";

type BudgetMonth = Database["public"]["Tables"]["budget_months"]["Row"];
type BudgetSource = Database["public"]["Tables"]["budget_sources"]["Row"];
type Expense = Database["public"]["Tables"]["budget_expenses"]["Row"];
type BudgetRecordType = Expense["record_type"];

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
  const [showMoney, setShowMoney] = useState(true);

  const [newExpenseName, setNewExpenseName] = useState("");
  const [newExpenseAmount, setNewExpenseAmount] = useState<number | "">("");
  const [newExpenseNote, setNewExpenseNote] = useState("");
  const [newRecordType, setNewRecordType] = useState<BudgetRecordType>("expense");
  const [isAddingExpense, setIsAddingExpense] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [editExpenseName, setEditExpenseName] = useState("");
  const [editExpenseAmount, setEditExpenseAmount] = useState<number | "">("");
  const [editExpenseNote, setEditExpenseNote] = useState("");
  const [editRecordType, setEditRecordType] = useState<BudgetRecordType>("expense");
  const [isUpdatingExpense, setIsUpdatingExpense] = useState(false);

  const [isSourceDialogOpen, setIsSourceDialogOpen] = useState(false);
  const [newSourceName, setNewSourceName] = useState("");
  const [isAddingSource, setIsAddingSource] = useState(false);
  const [isDeletingSource, setIsDeletingSource] = useState(false);
  const [isSourceActionsOpen, setIsSourceActionsOpen] = useState(false);
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
    const baseIncome = budget?.total_income || 0;
    const activeRecords = expenses.filter((item) => item.is_paid || item.is_selected);
    const recordIncome = activeRecords.reduce((sum, item) => {
      if (item.record_type === "income") {
        return sum + item.amount;
      }

      return sum;
    }, 0);
    const totalDeducted = activeRecords.reduce((sum, item) => {
      if (item.record_type === "expense") {
        return sum + item.amount;
      }

      return sum;
    }, 0);
    const availableIncome = baseIncome + recordIncome;
    const remaining = availableIncome - totalDeducted;

    return { baseIncome, recordIncome, availableIncome, totalDeducted, remaining };
  }, [budget, expenses]);

  const handleIncomeChange = async (values: NumberFormatValues) => {
    if (!budget) return;

    const value = values.floatValue || 0;
    const baseValue = value - calculations.recordIncome;
    setBudget((prev) => (prev ? { ...prev, total_income: baseValue } : null));

    const { error } = await supabase
      .from("budget_months")
      .update({ total_income: baseValue })
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
        record_type: newRecordType,
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
      toast.error("Lỗi thêm khoản thu chi");
    } else {
      setExpenses((current) => [...current, data]);
      setNewExpenseName("");
      setNewExpenseAmount("");
      setNewExpenseNote("");
      void haptics.trigger("success");
      toast.success(newRecordType === "income" ? "Đã thêm khoản thu" : "Đã thêm khoản chi");
    }

    setIsAddingExpense(false);
  };

  const openEditExpenseDialog = (expense: Expense) => {
    setEditingExpense(expense);
    setEditExpenseName(expense.name);
    setEditExpenseAmount(expense.amount);
    setEditExpenseNote(expense.note || "");
    setEditRecordType(expense.record_type);
  };

  const handleUpdateExpense = async () => {
    if (!editingExpense || !editExpenseName.trim() || editExpenseAmount === "") return;

    setIsUpdatingExpense(true);

    const payload = {
      record_type: editRecordType,
      name: editExpenseName.trim(),
      amount: Number(editExpenseAmount),
      note: editExpenseNote.trim() || null,
    };

    const { data, error } = await supabase
      .from("budget_expenses")
      .update(payload)
      .eq("id", editingExpense.id)
      .select()
      .single();

    if (error) {
      void haptics.trigger("error");
      toast.error("Không thể cập nhật khoản thu chi");
    } else {
      setExpenses((current) =>
        current.map((expense) => (expense.id === data.id ? data : expense)),
      );
      setEditingExpense(null);
      void haptics.trigger("success");
      toast.success("Đã cập nhật khoản thu chi");
    }

    setIsUpdatingExpense(false);
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

  const handleDeleteSource = async () => {
    if (!selectedSource || sources.length <= 1) return;

    const sourceToDelete = selectedSource;
    const remainingSources = sources.filter((source) => source.id !== sourceToDelete.id);
    const nextSelectedSource = remainingSources[0] || null;

    setIsDeletingSource(true);

    const { error } = await supabase
      .from("budget_sources")
      .update({ is_active: false })
      .eq("id", sourceToDelete.id);

    if (error) {
      void haptics.trigger("error");
      toast.error("Không thể xóa nguồn tiền");
    } else {
      setSources(remainingSources);
      setSelectedSourceId(nextSelectedSource?.id || null);
      void haptics.trigger("success");
      toast.success("Đã xóa nguồn tiền");
    }

    setIsDeletingSource(false);
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

      <TabletSplitLayout
        sidebarClassName="space-y-4"
        contentClassName="space-y-3"
        sidebar={
          <>
          <section className="rounded-2xl border bg-card p-2 shadow-sm">
            <div className="grid grid-cols-[2.75rem_1fr_2.75rem] items-center">
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 shrink-0 justify-self-start"
                onClick={() => {
                  void haptics.trigger("selection");
                  setCurrentMonth(subMonths(currentMonth, 1));
                }}
                aria-label="Tháng trước"
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>

              <div className="min-w-0 text-center">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Tháng
                </p>
                <p className="text-base font-black capitalize text-foreground">
                  {format(currentMonth, "MM/yyyy", { locale: vi })}
                </p>
              </div>

              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 shrink-0 justify-self-end"
                onClick={() => {
                  void haptics.trigger("selection");
                  setCurrentMonth(addMonths(currentMonth, 1));
                }}
                aria-label="Tháng sau"
              >
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>
          </section>

          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-500 to-purple-600 p-6 text-white shadow-xl">
            <div className="absolute top-0 right-0 p-3 opacity-20">
              <div className="h-32 w-32 translate-x-12 -translate-y-12 rounded-full bg-white blur-3xl"></div>
            </div>

            <div className="relative z-10 space-y-5">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  {loadingSources ? (
                    <div className="h-10 min-w-0 flex-1 animate-pulse rounded-xl bg-white/15" />
                  ) : (
                    <div
                      role="tablist"
                      aria-label="Nguồn tiền"
                      className="flex min-w-0 flex-1 gap-1 overflow-x-auto rounded-2xl bg-white/10 p-1"
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
                              "min-h-9 max-w-32 shrink-0 truncate rounded-xl px-3 text-xs font-bold transition",
                              active
                                ? "bg-white text-indigo-700 shadow-sm"
                                : "text-indigo-50 hover:bg-white/15",
                            )}
                          >
                            {source.name}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 shrink-0 rounded-full bg-white/15 text-white hover:bg-white/25 hover:text-white"
                    onClick={() => {
                      void haptics.trigger("light");
                      setShowMoney(!showMoney);
                    }}
                    aria-label={showMoney ? "Ẩn số tiền" : "Hiện số tiền"}
                  >
                    {showMoney ? (
                      <Eye className="h-5 w-5" />
                    ) : (
                      <EyeOff className="h-5 w-5" />
                    )}
                  </Button>

                  <Popover open={isSourceActionsOpen} onOpenChange={setIsSourceActionsOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10 shrink-0 rounded-full bg-white/15 text-white hover:bg-white/25 hover:text-white"
                        aria-label="Mở menu nguồn tiền"
                      >
                        <MoreHorizontal className="h-5 w-5" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent align="end" className="w-48 p-1">
                      <button
                        type="button"
                        className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-foreground hover:bg-muted"
                        onClick={() => {
                          setIsSourceActionsOpen(false);
                          openRenameSourceDialog();
                        }}
                        disabled={!selectedSource}
                      >
                        <Pencil className="h-4 w-4" />
                        Đổi tên
                      </button>
                      <button
                        type="button"
                        className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-foreground hover:bg-muted"
                        onClick={() => {
                          setIsSourceActionsOpen(false);
                          setIsSourceDialogOpen(true);
                        }}
                      >
                        <Plus className="h-4 w-4" />
                        Thêm nguồn
                      </button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <button
                            type="button"
                            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 disabled:pointer-events-none disabled:opacity-50"
                            disabled={!selectedSource || sources.length <= 1 || isDeletingSource}
                          >
                            {isDeletingSource ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                            Xóa nguồn
                          </button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Xóa nguồn tiền?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Nguồn “{selectedSource?.name}” sẽ bị ẩn khỏi danh sách ví. Các khoản thu chi cũ vẫn giữ trong dữ liệu.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Hủy</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => {
                                setIsSourceActionsOpen(false);
                                handleDeleteSource();
                              }}
                              className="bg-destructive"
                            >
                              Xóa
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-indigo-100">
                  Tiền hiện có
                </p>
                {showMoney ? (
                  <NumericFormat
                    value={calculations.availableIncome}
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

              <div className="grid grid-cols-2 gap-3 border-t border-white/20 pt-4">
                <div>
                  <p className="text-[10px] font-semibold uppercase text-indigo-100">
                    Gốc nhập tay
                  </p>
                  <p className="text-base font-semibold">
                    {showMoney ? formatCurrency(calculations.baseIncome) : "******"}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase text-indigo-100">
                    Thu vào
                  </p>
                  <p className="text-base font-semibold text-emerald-50">
                    {showMoney
                      ? `+${formatCurrency(calculations.recordIncome)}`
                      : "******"}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase text-indigo-100">
                    Dự kiến chi
                  </p>
                  <p className="text-base font-semibold">
                    {showMoney
                      ? `-${formatCurrency(calculations.totalDeducted)}`
                      : "******"}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase text-indigo-100">
                    Còn lại
                  </p>
                  <p className="text-lg font-bold">
                    {showMoney ? formatCurrency(calculations.remaining) : "******"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div
            className={cn(
              "space-y-3 rounded-3xl border border-dashed p-3 transition-colors md:p-4",
              newRecordType === "income"
                ? "border-emerald-300 bg-emerald-50/80 dark:border-emerald-900/60 dark:bg-emerald-950/20"
                : "border-red-300 bg-red-50/80 dark:border-red-900/60 dark:bg-red-950/20",
            )}
          >
            <div
              role="tablist"
              aria-label="Loại record"
              className="grid grid-cols-2 gap-1 rounded-2xl bg-background p-1"
            >
              {(
                [
                  {
                    value: "expense",
                    label: "Chi",
                    icon: ArrowDownLeft,
                  },
                  {
                    value: "income",
                    label: "Thu",
                    icon: ArrowUpRight,
                  },
                ] satisfies Array<{
                  value: BudgetRecordType;
                  label: string;
                  icon: typeof ArrowDownLeft;
                }>
              ).map((option) => {
                const Icon = option.icon;
                const active = newRecordType === option.value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => {
                      void haptics.trigger("selection");
                      setNewRecordType(option.value);
                    }}
                    className={cn(
                      "flex h-10 items-center justify-center gap-2 rounded-xl text-sm font-bold transition",
                      active
                        ? option.value === "income"
                          ? "bg-emerald-600 text-white shadow-sm"
                          : "bg-red-600 text-white shadow-sm"
                        : "text-muted-foreground hover:bg-muted",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {option.label}
                  </button>
                );
              })}
            </div>
            <Input
              placeholder={`Tên khoản ${newRecordType === "income" ? "thu" : "chi"} cho ${selectedSource?.name || "nguồn này"}`}
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
                placeholder={newRecordType === "income" ? "Số tiền thu vào" : "Số tiền chi"}
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
                className={cn(
                  "h-12 w-12 shrink-0 shadow-lg",
                  newRecordType === "income"
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : "bg-red-600 hover:bg-red-700",
                )}
              >
                {isAddingExpense ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Plus className="h-6 w-6" />
                )}
              </Button>
            </div>
          </div>
          </>
        }
      >
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-lg font-bold text-foreground">
                {selectedSource?.name || "Nguồn tiền"}
              </p>
              <p className="text-sm font-semibold text-muted-foreground">
                Danh sách thu chi
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
              title="Chưa có khoản thu chi nào"
              description="Thêm khoản thu hoặc chi đầu tiên để tính nhanh số tiền còn lại cho nguồn này."
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
                  onEdit={openEditExpenseDialog}
                  onDelete={deleteExpense}
                />
              ))}
            </div>
          )}
      </TabletSplitLayout>

      <div className="w-full px-8 pb-4 text-center text-xs text-muted-foreground opacity-70">
        Mỗi nguồn tiền là một tab riêng. Khoản chi chỉ thuộc tab đang chọn.
      </div>

      <Dialog open={isSourceDialogOpen} onOpenChange={setIsSourceDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Thêm nguồn tiền</DialogTitle>
            <DialogDescription>
              Nguồn mới sẽ có ngân sách và danh sách thu chi riêng cho từng tháng.
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

      <Dialog
        open={!!editingExpense}
        onOpenChange={(open) => !open && setEditingExpense(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Sửa khoản thu chi</DialogTitle>
            <DialogDescription>
              Cập nhật loại, tên, ghi chú và số tiền của record này.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div
              role="tablist"
              aria-label="Loại record cần sửa"
              className="grid grid-cols-2 gap-1 rounded-2xl bg-muted p-1"
            >
              {(
                [
                  { value: "expense", label: "Chi", icon: ArrowDownLeft },
                  { value: "income", label: "Thu", icon: ArrowUpRight },
                ] satisfies Array<{
                  value: BudgetRecordType;
                  label: string;
                  icon: typeof ArrowDownLeft;
                }>
              ).map((option) => {
                const Icon = option.icon;
                const active = editRecordType === option.value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => {
                      void haptics.trigger("selection");
                      setEditRecordType(option.value);
                    }}
                    className={cn(
                      "flex h-10 items-center justify-center gap-2 rounded-xl text-sm font-bold transition",
                      active
                        ? option.value === "income"
                          ? "bg-emerald-600 text-white shadow-sm"
                          : "bg-red-600 text-white shadow-sm"
                        : "text-muted-foreground hover:bg-background",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {option.label}
                  </button>
                );
              })}
            </div>

            <Input
              autoFocus
              placeholder={`Tên khoản ${editRecordType === "income" ? "thu" : "chi"}`}
              value={editExpenseName}
              onChange={(event) => setEditExpenseName(event.target.value)}
            />
            <Input
              placeholder="Ghi chú (tùy chọn)"
              value={editExpenseNote}
              onChange={(event) => setEditExpenseNote(event.target.value)}
            />
            <NumericFormat
              customInput={Input}
              placeholder={editRecordType === "income" ? "Số tiền thu vào" : "Số tiền chi"}
              value={editExpenseAmount}
              onValueChange={(values) => {
                setEditExpenseAmount(
                  values.floatValue === undefined ? "" : values.floatValue,
                );
              }}
              thousandSeparator="."
              decimalSeparator=","
              className="h-11"
              inputMode="decimal"
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditingExpense(null)}
            >
              Hủy
            </Button>
            <Button
              type="button"
              onClick={handleUpdateExpense}
              disabled={
                isUpdatingExpense ||
                !editExpenseName.trim() ||
                editExpenseAmount === ""
              }
              className={cn(
                editRecordType === "income"
                  ? "bg-emerald-600 hover:bg-emerald-700"
                  : "bg-red-600 hover:bg-red-700",
              )}
            >
              {isUpdatingExpense && <Loader2 className="h-4 w-4 animate-spin" />}
              Lưu thay đổi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
