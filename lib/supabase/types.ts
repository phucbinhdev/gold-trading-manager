export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      transactions: {
        Row: {
          id: string;
          created_at: string;
          transaction_date: string;
          amount_chi: number;
          price_per_chi: number;
          total_price: number | null; // Calculated column
          note: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          transaction_date?: string;
          amount_chi: number;
          price_per_chi: number;
          // total_price is auto-generated
          note?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          transaction_date?: string;
          amount_chi?: number;
          price_per_chi?: number;
          note?: string | null;
        };
      };
      budget_months: {
        Row: {
          id: string;
          month_key: string;
          total_income: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          month_key: string;
          total_income?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          month_key?: string;
          total_income?: number;
          created_at?: string;
        };
      };
      budget_expenses: {
        Row: {
          id: string;
          budget_id: string;
          name: string;
          amount: number;
          is_paid: boolean;
          is_selected: boolean;
          created_at: string;
          note: string | null;
        };
        Insert: {
          id?: string;
          budget_id: string;
          name: string;
          amount?: number;
          is_paid?: boolean;
          is_selected?: boolean;
          created_at?: string;
          note?: string | null;
        };
        Update: {
          id?: string;
          budget_id?: string;
          name?: string;
          amount?: number;
          is_paid?: boolean;
          is_selected?: boolean;
          created_at?: string;
          note?: string | null;
        };
      };
      app_settings: {
        Row: {
          key: string;
          value: string | null;
          updated_at: string;
        };
        Insert: {
          key: string;
          value?: string | null;
          updated_at?: string;
        };
        Update: {
          key?: string;
          value?: string | null;
          updated_at?: string;
        };
      };
    };
  };
}
