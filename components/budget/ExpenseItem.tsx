"use client";

import { Check, Trash2 } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { Database } from "@/lib/supabase/types";

type Expense = Database["public"]["Tables"]["budget_expenses"]["Row"];

interface ExpenseItemProps {
  expense: Expense;
  onToggleSelect: (id: string, currentSelected: boolean) => void;
  onTogglePaid: (id: string, currentPaid: boolean) => void;
  onDelete: (id: string) => void;
}

export function ExpenseItem({
  expense,
  onToggleSelect,
  onTogglePaid,
  onDelete,
}: ExpenseItemProps) {
  const handleTogglePaid = (e: React.MouseEvent) => {
    e.stopPropagation();
    onTogglePaid(expense.id, expense.is_paid);
  };

  const handleRowClick = () => {
    if (!expense.is_paid) {
      onToggleSelect(expense.id, expense.is_selected);
    }
  };

  return (
    <div
      onClick={handleRowClick}
      className={cn(
        "relative flex items-center justify-between p-4 rounded-xl border transition-all duration-300 select-none cursor-pointer active:scale-[0.98]",
        expense.is_paid
          ? "bg-green-500/10 border-green-500/30 shadow-none opacity-80" // Paid
          : expense.is_selected
            ? "bg-card border-primary/50 shadow-md transform scale-[1.02]" // Active
            : "bg-muted/40 border-transparent opacity-60 scale-95", // Inactive
      )}
    >
      <div className="flex items-center gap-3">
        {/* Status Indicator Icon - Clickable Checkbox */}
        <div
          onClick={handleTogglePaid}
          className={cn(
            "h-6 w-6 rounded-full flex items-center justify-center border-2 transition-colors cursor-pointer z-10 hover:scale-110 active:scale-90",
            expense.is_paid
              ? "bg-green-600 border-green-600 text-white"
              : expense.is_selected
                ? "border-primary bg-primary/20"
                : "border-muted-foreground/30",
          )}
        >
          {expense.is_paid && <Check className="h-3 w-3" />}
        </div>

        <div>
          <p
            className={cn(
              "font-medium transition-all",
              !expense.is_selected &&
                !expense.is_paid &&
                "line-through text-muted-foreground",
            )}
          >
            {expense.name}
          </p>
          <p className="text-xs text-muted-foreground font-mono">
            {formatCurrency(expense.amount)}
          </p>
        </div>
      </div>

      {expense.is_paid && (
        <div className="px-2 py-0.5 rounded text-[10px] font-bold bg-green-200 text-green-800 dark:bg-green-900 dark:text-green-300">
          ĐÃ CHI
        </div>
      )}

      {!expense.is_paid && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(expense.id);
          }}
          className="p-2 text-muted-foreground/50 hover:text-destructive transition-colors ml-2"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
