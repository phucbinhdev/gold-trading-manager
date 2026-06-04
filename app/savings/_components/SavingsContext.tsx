"use client";

import {
  createContext,
  type Dispatch,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
} from "react";
import { supabase } from "@/lib/supabase/client";

export type SavingsRow = {
  id: string;
  created_at: string;
  label: string;
  period_amount: number;
  periods_left: number;
  remaining_amount: number;
  closed: boolean;
  month_cells: Record<string, boolean>;
  closed_count: number;
};

export type SavingsRowInput = {
  label: string;
  period_amount: number;
  total_cells: number;
};

type SavingsState = {
  rows: SavingsRow[];
  loading: boolean;
  saving: boolean;
  error: string | null;
};

type SavingsAction =
  | { type: "load_start" }
  | { type: "load_success"; rows: SavingsRow[] }
  | { type: "load_error"; error: string }
  | { type: "saving_start" }
  | { type: "saving_end" }
  | { type: "set_error"; error: string | null };

type SavingsActions = {
  addRow: (input: SavingsRowInput) => Promise<void>;
  toggleCell: (row: SavingsRow, cellNumber: number) => Promise<void>;
  toggleClosed: (row: SavingsRow) => Promise<void>;
  removeRow: (rowId: string) => Promise<void>;
};

const initialState: SavingsState = {
  rows: [],
  loading: true,
  saving: false,
  error: null,
};

function savingsReducer(
  state: SavingsState,
  action: SavingsAction,
): SavingsState {
  switch (action.type) {
    case "load_start":
      return { ...state, loading: true, error: null };
    case "load_success":
      return { ...state, rows: action.rows, loading: false, error: null };
    case "load_error":
      return { ...state, loading: false, error: action.error };
    case "saving_start":
      return { ...state, saving: true, error: null };
    case "saving_end":
      return { ...state, saving: false };
    case "set_error":
      return { ...state, error: action.error };
    default:
      return state;
  }
}

const SavingsStateContext = createContext<SavingsState | null>(null);
const SavingsDispatchContext = createContext<Dispatch<SavingsAction> | null>(
  null,
);
const SavingsActionsContext = createContext<SavingsActions | null>(null);

export function getTotalCells(row: SavingsRow) {
  return Math.max(0, (row.periods_left || 0) + (row.closed_count || 0));
}

export function getCompletedCellSet(row: SavingsRow) {
  const totalCells = getTotalCells(row);
  const cellSet = new Set<number>();

  Object.entries(row.month_cells || {}).forEach(([key, value]) => {
    const cellNumber = Number(key);
    if (value && Number.isInteger(cellNumber) && cellNumber >= 1) {
      cellSet.add(cellNumber);
    }
  });

  // Backward compatibility with the old month-based boolean storage.
  if (cellSet.size === 0 && (row.closed_count || 0) > 0) {
    for (let index = 1; index <= Math.min(row.closed_count, totalCells); index += 1) {
      cellSet.add(index);
    }
  }

  return cellSet;
}

function normalizeRows(rows: SavingsRow[] | null): SavingsRow[] {
  return (rows || []).map((row) => {
    const monthCells = row.month_cells || {};
    const totalCells = Math.max(
      row.closed_count || 0,
      (row.periods_left || 0) + (row.closed_count || 0),
    );
    const closedCount = Math.min(row.closed_count || 0, totalCells);

    return {
      ...row,
      period_amount: row.period_amount || 0,
      periods_left: Math.max(0, totalCells - closedCount),
      remaining_amount: Math.max(0, (totalCells - closedCount) * (row.period_amount || 0)),
      month_cells: monthCells,
      closed_count: closedCount,
      closed: totalCells > 0 && closedCount >= totalCells,
    };
  });
}

export function SavingsProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(savingsReducer, initialState);

  const fetchRows = useCallback(async (showLoading = true) => {
    if (showLoading) {
      dispatch({ type: "load_start" });
    }

    const { data, error } = await supabase
      .from("savings")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) {
      dispatch({ type: "load_error", error: error.message });
      return;
    }

    dispatch({ type: "load_success", rows: normalizeRows(data || []) });
  }, []);

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  const actions = useMemo<SavingsActions>(
    () => ({
      async addRow(input) {
        dispatch({ type: "saving_start" });

        const totalCells = Math.max(0, Math.floor(input.total_cells || 0));
        const periodAmount = Math.max(0, Math.floor(input.period_amount || 0));

        const { error } = await supabase.from("savings").insert({
          label: input.label,
          period_amount: periodAmount,
          periods_left: totalCells,
          remaining_amount: totalCells * periodAmount,
          closed: false,
          month_cells: {},
          closed_count: 0,
        });

        if (error) {
          dispatch({ type: "set_error", error: error.message });
        } else {
          await fetchRows(false);
        }

        dispatch({ type: "saving_end" });
      },

      async toggleCell(row, cellNumber) {
        dispatch({ type: "set_error", error: null });

        const totalCells = getTotalCells(row);
        if (cellNumber < 1 || cellNumber > totalCells) return;

        const completedCells = getCompletedCellSet(row);
        if (completedCells.has(cellNumber)) {
          completedCells.delete(cellNumber);
        } else {
          completedCells.add(cellNumber);
        }

        const nextMonthCells: Record<string, boolean> = {};
        Array.from(completedCells)
          .sort((a, b) => a - b)
          .forEach((number) => {
            nextMonthCells[String(number)] = true;
          });

        const closedCount = completedCells.size;
        const periodsLeft = Math.max(0, totalCells - closedCount);
        const remainingAmount = periodsLeft * (row.period_amount || 0);
        const closed = totalCells > 0 && closedCount >= totalCells;

        const { error } = await supabase
          .from("savings")
          .update({
            closed,
            month_cells: nextMonthCells,
            periods_left: periodsLeft,
            remaining_amount: remainingAmount,
            closed_count: closedCount,
          })
          .eq("id", row.id);

        if (error) {
          dispatch({ type: "set_error", error: error.message });
        } else {
          await fetchRows(false);
        }
      },

      async toggleClosed(row) {
        dispatch({ type: "set_error", error: null });

        const totalCells = getTotalCells(row);
        const shouldComplete = !row.closed;
        const nextMonthCells: Record<string, boolean> = {};
        const closedCount = shouldComplete ? totalCells : 0;

        if (shouldComplete) {
          for (let index = 1; index <= totalCells; index += 1) {
            nextMonthCells[String(index)] = true;
          }
        }

        const periodsLeft = shouldComplete ? 0 : totalCells;
        const remainingAmount = periodsLeft * (row.period_amount || 0);

        const { error } = await supabase
          .from("savings")
          .update({
            closed: shouldComplete,
            month_cells: nextMonthCells,
            periods_left: periodsLeft,
            remaining_amount: remainingAmount,
            closed_count: closedCount,
          })
          .eq("id", row.id);

        if (error) {
          dispatch({ type: "set_error", error: error.message });
        } else {
          await fetchRows(false);
        }
      },

      async removeRow(rowId) {
        dispatch({ type: "set_error", error: null });

        const { error } = await supabase.from("savings").delete().eq("id", rowId);

        if (error) {
          dispatch({ type: "set_error", error: error.message });
        } else {
          await fetchRows(false);
        }
      },
    }),
    [fetchRows],
  );

  return (
    <SavingsStateContext.Provider value={state}>
      <SavingsDispatchContext.Provider value={dispatch}>
        <SavingsActionsContext.Provider value={actions}>
          {children}
        </SavingsActionsContext.Provider>
      </SavingsDispatchContext.Provider>
    </SavingsStateContext.Provider>
  );
}

export function useSavingsState() {
  const state = useContext(SavingsStateContext);
  if (!state) {
    throw new Error("useSavingsState must be used within SavingsProvider");
  }

  return state;
}

export function useSavingsDispatch() {
  const dispatch = useContext(SavingsDispatchContext);
  if (!dispatch) {
    throw new Error("useSavingsDispatch must be used within SavingsProvider");
  }

  return dispatch;
}

export function useSavingsActions() {
  const actions = useContext(SavingsActionsContext);
  if (!actions) {
    throw new Error("useSavingsActions must be used within SavingsProvider");
  }

  return actions;
}
