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
  useRef,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { queryKeys } from "@/lib/query-keys";

export type SavingsRow = {
  id: string;
  created_at: string;
  label: string;
  period_amount: number;
  periods_left: number;
  remaining_amount: number;
  closed: boolean;
  month_cells: Record<string, boolean>;
  cell_paid_at: Record<string, string>;
  cell_notes: Record<string, string>;
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
  pendingRowIds: string[];
  error: string | null;
};

type SavingsAction =
  | { type: "load_start" }
  | { type: "load_success"; rows: SavingsRow[] }
  | { type: "load_error"; error: string }
  | { type: "saving_start" }
  | { type: "saving_end" }
  | { type: "row_saving_start"; rowId: string }
  | { type: "row_saving_end"; rowId: string }
  | { type: "update_row"; row: SavingsRow }
  | { type: "remove_row"; rowId: string }
  | { type: "set_error"; error: string | null };

type SavingsActions = {
  refreshRows: () => Promise<void>;
  addRow: (input: SavingsRowInput) => Promise<void>;
  toggleCell: (row: SavingsRow, cellNumber: number) => Promise<void>;
  toggleClosed: (row: SavingsRow) => Promise<void>;
  updateCellNote: (row: SavingsRow, cellNumber: number, note: string) => Promise<void>;
  removeRow: (rowId: string) => Promise<void>;
};

const initialState: SavingsState = {
  rows: [],
  loading: true,
  saving: false,
  pendingRowIds: [],
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
    case "row_saving_start":
      return {
        ...state,
        pendingRowIds: state.pendingRowIds.includes(action.rowId)
          ? state.pendingRowIds
          : [...state.pendingRowIds, action.rowId],
        error: null,
      };
    case "row_saving_end":
      return {
        ...state,
        pendingRowIds: state.pendingRowIds.filter((rowId) => rowId !== action.rowId),
      };
    case "update_row":
      return {
        ...state,
        rows: state.rows.map((row) => (row.id === action.row.id ? action.row : row)),
      };
    case "remove_row":
      return {
        ...state,
        rows: state.rows.filter((row) => row.id !== action.rowId),
      };
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
  return (rows || []).map(normalizeRow);
}

function normalizeRow(row: SavingsRow): SavingsRow {
  const monthCells = row.month_cells || {};
  const cellPaidAt = row.cell_paid_at || {};
  const cellNotes = row.cell_notes || {};
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
    cell_paid_at: cellPaidAt,
    cell_notes: cellNotes,
    closed_count: closedCount,
    closed: totalCells > 0 && closedCount >= totalCells,
  };
}

function getNextRowState(
  row: SavingsRow,
  completedCells: Set<number>,
  cellPaidAt: Record<string, string>,
  cellNotes: Record<string, string> = row.cell_notes || {},
) {
  const totalCells = getTotalCells(row);
  const nextMonthCells: Record<string, boolean> = {};
  const nextCellPaidAt: Record<string, string> = {};
  const nextCellNotes: Record<string, string> = {};

  Array.from(completedCells)
    .sort((a, b) => a - b)
    .forEach((number) => {
      nextMonthCells[String(number)] = true;
      if (cellPaidAt[String(number)]) {
        nextCellPaidAt[String(number)] = cellPaidAt[String(number)];
      }
      if (cellNotes[String(number)]) {
        nextCellNotes[String(number)] = cellNotes[String(number)];
      }
    });

  const closedCount = completedCells.size;
  const periodsLeft = Math.max(0, totalCells - closedCount);
  const remainingAmount = periodsLeft * (row.period_amount || 0);
  const closed = totalCells > 0 && closedCount >= totalCells;

  return normalizeRow({
    ...row,
    closed,
    month_cells: nextMonthCells,
    cell_paid_at: nextCellPaidAt,
    cell_notes: nextCellNotes,
    periods_left: periodsLeft,
    remaining_amount: remainingAmount,
    closed_count: closedCount,
  });
}

export function SavingsProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(savingsReducer, initialState);
  const lockedRowIdsRef = useRef(new Set<string>());
  const queryClient = useQueryClient();

  const rowsQuery = useQuery({
    queryKey: queryKeys.savings.rows(),
    queryFn: async () => {
    const { data, error } = await supabase
      .from("savings")
      .select("*")
      .order("created_at", { ascending: true });

      if (error) throw error;
      return normalizeRows(data || []);
    },
  });

  const fetchRows = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.savings.rows() });
  }, [queryClient]);

  useEffect(() => {
    if (rowsQuery.isLoading) {
      dispatch({ type: "load_start" });
      return;
    }

    if (rowsQuery.error) {
      dispatch({ type: "load_error", error: rowsQuery.error.message });
      return;
    }

    if (rowsQuery.data) {
      dispatch({ type: "load_success", rows: rowsQuery.data });
    }
  }, [rowsQuery.data, rowsQuery.error, rowsQuery.isLoading]);

  const actions = useMemo<SavingsActions>(
    () => ({
      async refreshRows() {
        await fetchRows();
      },

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
          cell_paid_at: {},
          closed_count: 0,
        });

        if (error) {
          dispatch({ type: "set_error", error: error.message });
        } else {
          await fetchRows();
        }

        dispatch({ type: "saving_end" });
      },

      async toggleCell(row, cellNumber) {
        if (lockedRowIdsRef.current.has(row.id)) return;

        const totalCells = getTotalCells(row);
        if (cellNumber < 1 || cellNumber > totalCells) return;

        lockedRowIdsRef.current.add(row.id);
        dispatch({ type: "row_saving_start", rowId: row.id });

        const completedCells = getCompletedCellSet(row);
        const nextCellPaidAt = { ...(row.cell_paid_at || {}) };
        const nextCellNotes = { ...(row.cell_notes || {}) };
        if (completedCells.has(cellNumber)) {
          completedCells.delete(cellNumber);
          delete nextCellPaidAt[String(cellNumber)];
          delete nextCellNotes[String(cellNumber)];
        } else {
          completedCells.add(cellNumber);
          nextCellPaidAt[String(cellNumber)] = new Date().toISOString();
        }

        const nextRow = getNextRowState(row, completedCells, nextCellPaidAt, nextCellNotes);
        dispatch({ type: "update_row", row: nextRow });

        const { error } = await supabase
          .from("savings")
          .update({
            closed: nextRow.closed,
            month_cells: nextRow.month_cells,
            cell_paid_at: nextRow.cell_paid_at,
            periods_left: nextRow.periods_left,
            remaining_amount: nextRow.remaining_amount,
            closed_count: nextRow.closed_count,
          })
          .eq("id", row.id);

        if (error) {
          dispatch({ type: "set_error", error: error.message });
          await fetchRows();
        } else {
          void fetchRows();
        }

        lockedRowIdsRef.current.delete(row.id);
        dispatch({ type: "row_saving_end", rowId: row.id });
      },

      async toggleClosed(row) {
        if (lockedRowIdsRef.current.has(row.id)) return;

        const totalCells = getTotalCells(row);
        const shouldComplete = !row.closed;
        const completedCells = new Set<number>();
        const nextCellPaidAt: Record<string, string> = {};
        const nextCellNotes = { ...(row.cell_notes || {}) };
        const paidAt = new Date().toISOString();

        if (shouldComplete) {
          for (let index = 1; index <= totalCells; index += 1) {
            completedCells.add(index);
            nextCellPaidAt[String(index)] = row.cell_paid_at?.[String(index)] || paidAt;
          }
        }

        lockedRowIdsRef.current.add(row.id);
        dispatch({ type: "row_saving_start", rowId: row.id });
        const nextRow = getNextRowState(row, completedCells, nextCellPaidAt, nextCellNotes);
        dispatch({ type: "update_row", row: nextRow });

        const { error } = await supabase
          .from("savings")
          .update({
            closed: nextRow.closed,
            month_cells: nextRow.month_cells,
            cell_paid_at: nextRow.cell_paid_at,
            periods_left: nextRow.periods_left,
            remaining_amount: nextRow.remaining_amount,
            closed_count: nextRow.closed_count,
          })
          .eq("id", row.id);

        if (error) {
          dispatch({ type: "set_error", error: error.message });
          await fetchRows();
        } else {
          void fetchRows();
        }

        lockedRowIdsRef.current.delete(row.id);
        dispatch({ type: "row_saving_end", rowId: row.id });
      },

      async updateCellNote(row, cellNumber, note) {
        if (lockedRowIdsRef.current.has(row.id)) return;

        const completedCells = getCompletedCellSet(row);
        if (!completedCells.has(cellNumber)) return;

        const nextCellNotes = { ...(row.cell_notes || {}) };
        const trimmedNote = note.trim();

        if (trimmedNote) {
          nextCellNotes[String(cellNumber)] = trimmedNote;
        } else {
          delete nextCellNotes[String(cellNumber)];
        }

        lockedRowIdsRef.current.add(row.id);
        dispatch({ type: "row_saving_start", rowId: row.id });

        const nextRow = normalizeRow({
          ...row,
          cell_notes: nextCellNotes,
        });
        dispatch({ type: "update_row", row: nextRow });

        const { error } = await supabase
          .from("savings")
          .update({ cell_notes: nextRow.cell_notes })
          .eq("id", row.id);

        if (error) {
          dispatch({ type: "set_error", error: error.message });
          await fetchRows();
        } else {
          void fetchRows();
        }

        lockedRowIdsRef.current.delete(row.id);
        dispatch({ type: "row_saving_end", rowId: row.id });
      },

      async removeRow(rowId) {
        if (lockedRowIdsRef.current.has(rowId)) return;

        lockedRowIdsRef.current.add(rowId);
        dispatch({ type: "row_saving_start", rowId });
        const { error } = await supabase.from("savings").delete().eq("id", rowId);

        if (error) {
          dispatch({ type: "set_error", error: error.message });
        } else {
          dispatch({ type: "remove_row", rowId });
          void fetchRows();
        }

        lockedRowIdsRef.current.delete(rowId);
        dispatch({ type: "row_saving_end", rowId });
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
