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
