import { createClient } from "@supabase/supabase-js";
import type { Settings, Record } from "@/types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Settings functions
export async function getSettings(): Promise<Settings | null> {
  const { data, error } = await supabase.from("settings").select("*").single();

  if (error) {
    console.error("Error fetching settings:", error);
    return null;
  }

  return data;
}

export async function upsertSettings(
  settings: Omit<Settings, "id" | "created_at" | "updated_at">,
): Promise<Settings | null> {
  // Try to get existing settings first
  const existing = await getSettings();

  if (existing) {
    // Update existing
    const { data, error } = await supabase
      .from("settings")
      .update({ ...settings, updated_at: new Date().toISOString() })
      .eq("id", existing.id)
      .select()
      .single();

    if (error) {
      console.error("Error updating settings:", error);
      return null;
    }

    return data;
  } else {
    // Insert new
    const { data, error } = await supabase
      .from("settings")
      .insert([settings])
      .select()
      .single();

    if (error) {
      console.error("Error creating settings:", error);
      return null;
    }

    return data;
  }
}

// Records functions
export async function getRecords(): Promise<Record[]> {
  const { data, error } = await supabase
    .from("records")
    .select("*, record_custom_fees(*)")
    .order("month", { ascending: false });

  if (error) {
    console.error("Error fetching records:", error);
    return [];
  }

  return data || [];
}

export async function getLatestRecord(): Promise<Record | null> {
  const { data, error } = await supabase
    .from("records")
    .select("*")
    .order("month", { ascending: false })
    .limit(1)
    .single();

  if (error) {
    console.error("Error fetching latest record:", error);
    return null;
  }

  return data;
}

export async function createRecord(
  record: Omit<Record, "id" | "created_at">,
): Promise<Record | null> {
  const { data, error } = await supabase
    .from("records")
    .insert([record])
    .select()
    .single();

  if (error) {
    console.error("Error creating record:", error);
    return null;
  }

  return data;
}

export async function deleteRecord(id: string): Promise<boolean> {
  const { error } = await supabase.from("records").delete().eq("id", id);

  if (error) {
    console.error("Error deleting record:", error);
    return false;
  }

  return true;
}

// Custom Fees functions
export async function getCustomFees(): Promise<import("@/types").CustomFee[]> {
  const { data, error } = await supabase
    .from("custom_fees")
    .select("*")
    .order("name");

  if (error) {
    console.error("Error fetching custom fees:", error);
    return [];
  }

  return data || [];
}

export async function getActiveCustomFees(): Promise<
  import("@/types").CustomFee[]
> {
  const { data, error } = await supabase
    .from("custom_fees")
    .select("*")
    .eq("is_active", true)
    .order("name");

  if (error) {
    console.error("Error fetching active custom fees:", error);
    return [];
  }

  return data || [];
}

export async function createCustomFee(
  fee: Omit<import("@/types").CustomFee, "id" | "created_at" | "updated_at">,
): Promise<import("@/types").CustomFee | null> {
  const { data, error } = await supabase
    .from("custom_fees")
    .insert([fee])
    .select()
    .single();

  if (error) {
    console.error("Error creating custom fee:", error);
    return null;
  }

  return data;
}

export async function updateCustomFee(
  id: string,
  fee: Partial<
    Omit<import("@/types").CustomFee, "id" | "created_at" | "updated_at">
  >,
): Promise<import("@/types").CustomFee | null> {
  const { data, error } = await supabase
    .from("custom_fees")
    .update({ ...fee, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error updating custom fee:", error);
    return null;
  }

  return data;
}

export async function deleteCustomFee(id: string): Promise<boolean> {
  const { error } = await supabase.from("custom_fees").delete().eq("id", id);

  if (error) {
    console.error("Error deleting custom fee:", error);
    return false;
  }

  return true;
}

// Record Custom Fees functions
export async function createRecordCustomFees(
  recordId: string,
  customFeesData: Array<{
    custom_fee_id: string;
    fee_name: string;
    quantity: number;
    amount: number;
  }>,
): Promise<boolean> {
  const recordCustomFees = customFeesData.map((fee) => ({
    record_id: recordId,
    custom_fee_id: fee.custom_fee_id,
    fee_name: fee.fee_name,
    quantity: fee.quantity,
    amount: fee.amount,
  }));

  const { error } = await supabase
    .from("record_custom_fees")
    .insert(recordCustomFees);

  if (error) {
    console.error("Error creating record custom fees:", error);
    return false;
  }

  return true;
}

export async function getRecordCustomFees(
  recordId: string,
): Promise<import("@/types").RecordCustomFee[]> {
  const { data, error } = await supabase
    .from("record_custom_fees")
    .select("*")
    .eq("record_id", recordId);

  if (error) {
    console.error("Error fetching record custom fees:", error);
    return [];
  }

  return data || [];
}
