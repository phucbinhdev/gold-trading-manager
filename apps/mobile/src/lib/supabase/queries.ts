import { getSupabase } from './client';
import type { Database } from './types';

type TableRow<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];
const DEFAULT_SOURCE_NAME = 'Nguồn chính';

export async function getGoldDashboard() {
  const supabase = getSupabase();

  const [{ data: transactions, error: transactionError }, { data: setting }] = await Promise.all([
    supabase.from('transactions').select('*').order('transaction_date', { ascending: false }),
    supabase.from('app_settings').select('value').eq('key', 'current_gold_price').maybeSingle(),
  ]);

  if (transactionError) throw transactionError;

  const rows = (transactions ?? []) as TableRow<'transactions'>[];
  const marketPrice = setting?.value ? Number(setting.value) : 0;
  const totalChi = rows.reduce((sum, row) => sum + Number(row.amount_chi ?? 0), 0);
  const totalInvested = rows.reduce(
    (sum, row) =>
      sum + Number(row.total_price ?? Number(row.amount_chi ?? 0) * Number(row.price_per_chi ?? 0)),
    0
  );
  const marketValue = totalChi * marketPrice;

  return {
    marketPrice,
    totalChi,
    totalInvested,
    marketValue,
    profit: marketValue - totalInvested,
    transactions: rows,
  };
}

export async function createGoldTransaction(input: {
  transactionDate: string;
  amountChi: number;
  pricePerChi: number;
  note?: string | null;
}) {
  const supabase = getSupabase();

  const { error } = await supabase.from('transactions').insert({
    transaction_date: input.transactionDate,
    amount_chi: input.amountChi,
    price_per_chi: input.pricePerChi,
    note: input.note || null,
  });

  if (error) throw error;
}

export async function deleteGoldTransaction(id: string) {
  const supabase = getSupabase();
  const { error } = await supabase.from('transactions').delete().eq('id', id);

  if (error) throw error;
}

export async function getBudgetDashboard() {
  const supabase = getSupabase();

  const { data: month, error: monthError } = await supabase
    .from('budget_months')
    .select('*')
    .order('month_key', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (monthError) throw monthError;

  const budgetMonth = month as TableRow<'budget_months'> | null;

  if (!budgetMonth) {
    return { month: null, expenses: [], totalSelected: 0, totalPaid: 0, remaining: 0 };
  }

  const { data: expenses, error: expenseError } = await supabase
    .from('budget_expenses')
    .select('*')
    .eq('budget_id', budgetMonth.id)
    .order('created_at', { ascending: false });

  if (expenseError) throw expenseError;

  const rows = (expenses ?? []) as TableRow<'budget_expenses'>[];
  const totalSelected = rows
    .filter((row) => row.is_selected)
    .reduce((sum, row) => sum + Number(row.amount ?? 0), 0);
  const totalPaid = rows
    .filter((row) => row.is_paid)
    .reduce((sum, row) => sum + Number(row.amount ?? 0), 0);

  return {
    month: budgetMonth,
    expenses: rows.slice(0, 8),
    totalSelected,
    totalPaid,
    remaining: Number(budgetMonth.total_income ?? 0) - totalSelected,
  };
}

export async function createBudgetRecord(input: {
  recordType: 'expense' | 'income';
  name: string;
  amount: number;
  note?: string | null;
  monthKey?: string;
}) {
  const supabase = getSupabase();
  const monthKey = input.monthKey ?? new Date().toISOString().slice(0, 7);
  const source = await getOrCreateDefaultBudgetSource();
  const budget = await getOrCreateBudgetMonth(source.id, monthKey);

  const { error } = await supabase.from('budget_expenses').insert({
    budget_id: budget.id,
    record_type: input.recordType,
    name: input.name,
    amount: input.amount,
    is_selected: true,
    is_paid: false,
    note: input.note || null,
  });

  if (error) throw error;
}

async function getOrCreateDefaultBudgetSource() {
  const supabase = getSupabase();
  const { data: sources, error } = await supabase
    .from('budget_sources')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })
    .limit(1);

  if (error) throw error;

  const existing = (sources?.[0] ?? null) as TableRow<'budget_sources'> | null;
  if (existing) return existing;

  const { data, error: createError } = await supabase
    .from('budget_sources')
    .insert({ name: DEFAULT_SOURCE_NAME, sort_order: 0, is_active: true })
    .select()
    .single();

  if (createError) throw createError;

  return data as TableRow<'budget_sources'>;
}

async function getOrCreateBudgetMonth(sourceId: string, monthKey: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('budget_months')
    .select('*')
    .eq('month_key', monthKey)
    .eq('source_id', sourceId)
    .maybeSingle();

  if (error) throw error;

  const existing = data as TableRow<'budget_months'> | null;
  if (existing) return existing;

  const { data: created, error: createError } = await supabase
    .from('budget_months')
    .insert({ month_key: monthKey, source_id: sourceId, total_income: 0 })
    .select()
    .single();

  if (createError) {
    if (createError.code === '23505') {
      const { data: reloaded, error: reloadError } = await supabase
        .from('budget_months')
        .select('*')
        .eq('month_key', monthKey)
        .eq('source_id', sourceId)
        .single();

      if (reloadError) throw reloadError;
      return reloaded as TableRow<'budget_months'>;
    }

    throw createError;
  }

  return created as TableRow<'budget_months'>;
}

export async function getRentalDashboard() {
  const supabase = getSupabase();

  const [{ data: settings }, { data: latestRecord }, { data: customFees }] = await Promise.all([
    supabase.from('settings').select('*').maybeSingle(),
    supabase.from('records').select('*').order('month', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('custom_fees').select('*').eq('is_active', true).order('name'),
  ]);

  return {
    settings: settings as TableRow<'settings'> | null,
    latestRecord: latestRecord as TableRow<'records'> | null,
    activeFees: (customFees ?? []) as TableRow<'custom_fees'>[],
  };
}

export async function getSavingsDashboard() {
  const supabase = getSupabase();

  const { data, error } = await supabase.from('savings').select('*').order('created_at');

  if (error) throw error;

  const rows = (data ?? []) as TableRow<'savings'>[];
  const totalRemaining = rows.reduce((sum, row) => sum + Number(row.remaining_amount ?? 0), 0);
  const totalClosed = rows.reduce((sum, row) => sum + Number(row.closed_count ?? 0), 0);

  return { rows, totalRemaining, totalClosed };
}

export async function getIpadDashboard() {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('ipad_transactions')
    .select('*')
    .order('purchase_date', { ascending: false });

  if (error) throw error;

  const rows = (data ?? []) as TableRow<'ipad_transactions'>[];
  const inStock = rows.filter((row) => row.status !== 'sold');
  const sold = rows.filter((row) => row.status === 'sold');
  const totalCost = inStock.reduce((sum, row) => sum + Number(row.total_cost ?? 0), 0);
  const realizedProfit = sold.reduce((sum, row) => sum + Number(row.profit_amount ?? 0), 0);

  return {
    inStockCount: inStock.length,
    soldCount: sold.length,
    totalCost,
    realizedProfit,
    transactions: rows,
  };
}

export async function createIpadTransaction(input: {
  purchaseDate: string;
  deviceName: string;
  storage?: string | null;
  color?: string | null;
  purchasePrice: number;
  extraCost?: number;
  loanAmount?: number;
  note?: string | null;
}) {
  const supabase = getSupabase();
  const { error } = await supabase.from('ipad_transactions').insert({
    purchase_date: input.purchaseDate,
    device_name: input.deviceName,
    storage: input.storage || null,
    color: input.color || null,
    purchase_price: input.purchasePrice,
    extra_cost: input.extraCost ?? 0,
    loan_amount: input.loanAmount ?? 0,
    note: input.note || null,
    status: 'importing',
  });

  if (error) throw error;
}

export async function createRentalRecord(input: {
  month: string;
  electricOld: number;
  electricNew: number;
  waterOld: number;
  waterNew: number;
}) {
  const supabase = getSupabase();

  const { data: settings } = await supabase.from('settings').select('*').maybeSingle();
  const s = settings as TableRow<'settings'> | null;
  const rentAmount = Number(s?.rent_price ?? 0);
  const electricPrice = Number(s?.electric_price ?? 0);
  const waterPrice = Number(s?.water_price ?? 0);
  const electricUsed = Math.max(0, input.electricNew - input.electricOld);
  const waterUsed = Math.max(0, input.waterNew - input.waterOld);
  const electricAmount = electricUsed * electricPrice;
  const waterAmount = waterUsed * waterPrice;
  const totalAmount = rentAmount + electricAmount + waterAmount;

  const { error } = await supabase.from('records').insert({
    month: input.month,
    electric_old: input.electricOld,
    electric_new: input.electricNew,
    water_old: input.waterOld,
    water_new: input.waterNew,
    rent_amount: rentAmount,
    electric_amount: electricAmount,
    water_amount: waterAmount,
    total_amount: totalAmount,
  });

  if (error) throw error;
}

export async function createSavings(input: {
  label: string;
  periodAmount: number;
  periodsLeft: number;
}) {
  const supabase = getSupabase();
  const remainingAmount = input.periodAmount * input.periodsLeft;

  const { error } = await supabase.from('savings').insert({
    label: input.label,
    period_amount: input.periodAmount,
    periods_left: input.periodsLeft,
    remaining_amount: remainingAmount,
    closed: false,
    closed_count: 0,
    month_cells: {},
    cell_paid_at: {},
    cell_notes: {},
  });

  if (error) throw error;
}

export async function sellIpadTransaction(input: {
  id: string;
  sellingPrice: number;
  totalCost: number;
  note?: string | null;
}) {
  const supabase = getSupabase();
  const profitAmount = input.sellingPrice - input.totalCost;

  const { error } = await supabase
    .from('ipad_transactions')
    .update({
      selling_price: input.sellingPrice,
      profit_amount: profitAmount,
      status: 'sold',
      note: input.note || null,
    })
    .eq('id', input.id);

  if (error) throw error;
}

export async function toggleBudgetExpensePaid(id: string, isPaid: boolean) {
  const supabase = getSupabase();
  const { error } = await supabase
    .from('budget_expenses')
    .update({ is_paid: isPaid })
    .eq('id', id);

  if (error) throw error;
}

export async function updateMarketPrice(price: number) {
  const supabase = getSupabase();
  const { error } = await supabase
    .from('app_settings')
    .upsert({ key: 'current_gold_price', value: String(price) }, { onConflict: 'key' });

  if (error) throw error;
}

export async function toggleSavingsCell(
  id: string,
  cellKey: string,
  currentCellPaidAt: Record<string, string>,
  currentCellNotes: Record<string, string>,
  closedCount: number,
  periodsLeft: number,
  periodAmount: number
) {
  const supabase = getSupabase();
  const newCellPaidAt = { ...currentCellPaidAt };
  let newClosedCount: number;
  let newPeriodsLeft: number;

  if (cellKey in newCellPaidAt) {
    delete newCellPaidAt[cellKey];
    newClosedCount = closedCount - 1;
    newPeriodsLeft = periodsLeft + 1;
  } else {
    newCellPaidAt[cellKey] = new Date().toISOString();
    newClosedCount = closedCount + 1;
    newPeriodsLeft = periodsLeft - 1;
  }

  const remainingAmount = newPeriodsLeft * periodAmount;

  const { error } = await supabase
    .from('savings')
    .update({
      cell_paid_at: newCellPaidAt,
      cell_notes: currentCellNotes,
      closed_count: newClosedCount,
      periods_left: newPeriodsLeft,
      remaining_amount: remainingAmount,
    })
    .eq('id', id);

  if (error) throw error;

  return { newCellPaidAt, newClosedCount, newPeriodsLeft };
}

export async function deleteIpadTransaction(id: string) {
  const supabase = getSupabase();
  const { error } = await supabase.from('ipad_transactions').delete().eq('id', id);

  if (error) throw error;
}

export async function updateIpadStatus(id: string, status: 'importing' | 'in_stock' | 'sold') {
  const supabase = getSupabase();
  const { error } = await supabase
    .from('ipad_transactions')
    .update({ status })
    .eq('id', id);

  if (error) throw error;
}

export async function updateIpadSalePrice(id: string, sellingPrice: number, totalCost: number) {
  const supabase = getSupabase();
  const profitAmount = sellingPrice - totalCost;

  const { error } = await supabase
    .from('ipad_transactions')
    .update({ selling_price: sellingPrice, profit_amount: profitAmount, status: 'sold' })
    .eq('id', id);

  if (error) throw error;
}

export async function toggleIpadDebt(id: string, debtPaid: boolean) {
  const supabase = getSupabase();
  const { error } = await supabase
    .from('ipad_transactions')
    .update({ debt_paid: debtPaid, debt_paid_at: debtPaid ? new Date().toISOString() : null })
    .eq('id', id);

  if (error) throw error;
}

export type GoldTransaction = TableRow<'transactions'>;
export type BudgetExpense = TableRow<'budget_expenses'>;
export type RentalRecord = TableRow<'records'>;
export type SavingsRow = TableRow<'savings'>;
export type IpadTransaction = TableRow<'ipad_transactions'>;
