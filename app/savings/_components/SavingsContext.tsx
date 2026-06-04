"use client";

import {
  createContext,
  type Dispatch,
  type ReactNode,
  useContext,
  useReducer,
} from "react";

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

export function SavingsProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(savingsReducer, initialState);

  return (
    <SavingsStateContext.Provider value={state}>
      <SavingsDispatchContext.Provider value={dispatch}>
        {children}
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
