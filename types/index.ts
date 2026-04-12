export interface Settings {
  id: string;
  rent_price: number;
  electric_price: number;
  water_price: number;
  created_at: string;
  updated_at: string;
  bank_id?: string;
  bank_name?: string;
  account_number?: string;
  account_name?: string;
}

export interface CustomFee {
  id: string;
  name: string;
  type: "fixed" | "unit";
  unit_price?: number;
  fixed_amount?: number;
  unit_name?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface RecordCustomFee {
  id: string;
  record_id: string;
  custom_fee_id: string;
  fee_name: string;
  quantity: number;
  amount: number;
  created_at: string;
}

export interface Record {
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
  custom_fees?: RecordCustomFee[];
  record_custom_fees?: RecordCustomFee[]; // Joined via Supabase
}

export interface CalculationResult {
  rent_amount: number;
  electric_used: number;
  electric_amount: number;
  water_used: number;
  water_amount: number;
  custom_fees_total: number;
  custom_fees_details: Array<{
    fee_id: string;
    fee_name: string;
    quantity: number;
    amount: number;
  }>;
  total_amount: number;
}
