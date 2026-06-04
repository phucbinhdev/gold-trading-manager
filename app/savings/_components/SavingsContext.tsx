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

export type SavingsRowInput = Omit<
  SavingsRow,
  "id" | "created_at" | "month_cells" | "closed_count" | "closed"
> & { month_cells?: Record<string, boolean> };

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

function getCurrentMonthKey() {
  return new Date().toISOString().slice(0, 7);
}

function normalizeRows(rows: SavingsRow[] | null): SavingsRow[] {
  const monthKey = getCurrentMonthKey();

  return (rows || []).map((row) => {
    const monthCells = row.month_cells || {};

    return {
      ...row,
      month_cells: monthCells,
      closed: Boolean(monthCells[monthKey]),
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

        const { error } = await supabase.from("savings").insert({
          label: input.label,
          period_amount: input.period_amount,
          periods_left: input.periods_left,
          remaining_amount: input.remaining_amount,
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

      async toggleClosed(row) {
        dispatch({ type: "set_error", error: null });

        const nextClosed = !row.closed;
        const monthKey = getCurrentMonthKey();
        const nextMonthCells = { ...(row.month_cells || {}) };
        nextMonthCells[monthKey] = nextClosed;

        const patch: Record<string, unknown> = {
          closed: nextClosed,
          month_cells: nextMonthCells,
        };

        if (nextClosed) {
          patch.periods_left = Math.max(0, (row.periods_left || 0) - 1);
          patch.remaining_amount = Math.max(
            0,
            (row.remaining_amount || 0) - (row.period_amount || 0),
          );
          patch.closed_count = (row.closed_count || 0) + 1;
        } else {
          patch.periods_left = (row.periods_left || 0) + 1;
          patch.remaining_amount =
            (row.remaining_amount || 0) + (row.period_amount || 0);
          patch.closed_count = Math.max(0, (row.closed_count || 0) - 1);
        }

        const { error } = await supabase
          .from("savings")
          .update(patch)
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
