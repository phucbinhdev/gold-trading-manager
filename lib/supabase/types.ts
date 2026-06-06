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
          source_id: string;
          total_income: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          month_key: string;
          source_id: string;
          total_income?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          month_key?: string;
          source_id?: string;
          total_income?: number;
          created_at?: string;
        };
      };
      budget_sources: {
        Row: {
          id: string;
          created_at: string;
          name: string;
          sort_order: number;
          is_active: boolean;
        };
        Insert: {
          id?: string;
          created_at?: string;
          name: string;
          sort_order?: number;
          is_active?: boolean;
        };
        Update: {
          id?: string;
          created_at?: string;
          name?: string;
          sort_order?: number;
          is_active?: boolean;
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
      ipad_transactions: {
        Row: {
          id: string;
          created_at: string;
          purchase_date: string;
          device_name: string;
          storage: string | null;
          color: string | null;
          serial_number: string | null;
          purchase_price: number;
          extra_cost: number;
          loan_amount: number;
          selling_price: number | null;
          sale_date: string | null;
          note: string | null;
          debt_paid: boolean;
          debt_paid_at: string | null;
          total_cost: number;
          profit_amount: number | null;
          status: "selling" | "sold";
        };
        Insert: {
          id?: string;
          created_at?: string;
          purchase_date?: string;
          device_name: string;
          storage?: string | null;
          color?: string | null;
          serial_number?: string | null;
          purchase_price: number;
          extra_cost?: number;
          loan_amount?: number;
          selling_price?: number | null;
          sale_date?: string | null;
          note?: string | null;
          debt_paid?: boolean;
          debt_paid_at?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          purchase_date?: string;
          device_name?: string;
          storage?: string | null;
          color?: string | null;
          serial_number?: string | null;
          purchase_price?: number;
          extra_cost?: number;
          loan_amount?: number;
          selling_price?: number | null;
          sale_date?: string | null;
          note?: string | null;
          debt_paid?: boolean;
          debt_paid_at?: string | null;
        };
      };
      wishlist: {
        Row: {
          id: string;
          created_at: string;
          name: string;
          note: string | null;
          price: number | null;
          priority: "Low" | "Medium" | "High";
          is_purchased: boolean;
          product_url: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          name: string;
          note?: string | null;
          price?: number | null;
          priority?: "Low" | "Medium" | "High";
          is_purchased?: boolean;
          product_url?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          name?: string;
          note?: string | null;
          price?: number | null;
          priority?: "Low" | "Medium" | "High";
          is_purchased?: boolean;
          product_url?: string | null;
        };
      };
      diary: {
        Row: {
          id: string;
          created_at: string;
          date: string;
          content: string;
          mood: string;
          mood_level: number;
          image_urls: string[] | null;
          is_encrypted: boolean;
        };
        Insert: {
          id?: string;
          created_at?: string;
          date?: string;
          content: string;
          mood?: string;
          mood_level?: number;
          image_urls?: string[] | null;
          is_encrypted?: boolean;
        };
        Update: {
          id?: string;
          created_at?: string;
          date?: string;
          content?: string;
          mood?: string;
          mood_level?: number;
          image_urls?: string[] | null;
          is_encrypted?: boolean;
        };
      };
      settings: {
        Row: {
          id: string;
          rent_price: number;
          electric_price: number;
          water_price: number;
          bank_id: string | null;
          bank_name: string | null;
          account_number: string | null;
          account_name: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          rent_price?: number;
          electric_price?: number;
          water_price?: number;
          bank_id?: string | null;
          bank_name?: string | null;
          account_number?: string | null;
          account_name?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          rent_price?: number;
          electric_price?: number;
          water_price?: number;
          bank_id?: string | null;
          bank_name?: string | null;
          account_number?: string | null;
          account_name?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      records: {
        Row: {
          id: string;
          month: string;
          electric_old: number;
          electric_new: number;
          water_old: number;
          water_new: number;
          rent_amount: number;
          electric_amount: number;
          water_amount: number;
          total_amount: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          month: string;
          electric_old?: number;
          electric_new: number;
          water_old?: number;
          water_new: number;
          rent_amount?: number;
          electric_amount?: number;
          water_amount?: number;
          total_amount: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          month?: string;
          electric_old?: number;
          electric_new?: number;
          water_old?: number;
          water_new?: number;
          rent_amount?: number;
          electric_amount?: number;
          water_amount?: number;
          total_amount?: number;
          created_at?: string;
        };
      };
      custom_fees: {
        Row: {
          id: string;
          name: string;
          type: string;
          unit_price: number | null;
          fixed_amount: number | null;
          unit_name: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          type: string;
          unit_price?: number | null;
          fixed_amount?: number | null;
          unit_name?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          type?: string;
          unit_price?: number | null;
          fixed_amount?: number | null;
          unit_name?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      record_custom_fees: {
        Row: {
          id: string;
          record_id: string;
          custom_fee_id: string | null;
          fee_name: string;
          quantity: number;
          amount: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          record_id: string;
          custom_fee_id?: string | null;
          fee_name: string;
          quantity?: number;
          amount: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          record_id?: string;
          custom_fee_id?: string | null;
          fee_name?: string;
          quantity?: number;
          amount?: number;
          created_at?: string;
        };
      };
    };
  };
}
