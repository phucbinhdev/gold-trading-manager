"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { Database } from "@/lib/supabase/types";
import { Overview } from "@/components/gold/Overview";
import { TransactionForm } from "@/components/gold/TransactionForm";
import { TransactionList } from "@/components/gold/TransactionList";
import { Loader2 } from "lucide-react";

type Transaction = Database["public"]["Tables"]["transactions"]["Row"];

export default function Home() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [marketPrice, setMarketPrice] = useState<number>(8000000); // Default 8,000,000
  const [loading, setLoading] = useState(true);

  // Fetch Data
  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Get Transactions
      const { data: txData, error: txError } = await supabase
        .from("transactions")
        .select("*")
        .order("transaction_date", { ascending: false });

      if (txError) throw txError;
      setTransactions(txData || []);

      // 2. Get Market Price Setting (Optional - if we want to persist it)
      // For now, let's just default to local state or last saved.
      // We can implement saving to 'app_settings' when user changes input with a debounce.
      const { data: settingsData } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "current_gold_price")
        .single();

      if (settingsData?.value) {
        setMarketPrice(Number(settingsData.value));
      }
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Update Market Price in DB (Debounced ideal, but simple save for now)
  const handlePriceChange = async (newPrice: number) => {
    setMarketPrice(newPrice);
    // Save to DB silently
    await supabase.from("app_settings").upsert({
      key: "current_gold_price",
      value: String(newPrice),
      updated_at: new Date().toISOString(),
    });
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Calculations
  const totalChi = transactions.reduce((acc, t) => acc + t.amount_chi, 0);
  const totalInvested = transactions.reduce(
    (acc, t) => acc + (t.total_price || t.amount_chi * t.price_per_chi),
    0,
  );

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">
            Quản Lý Mua Vàng
          </h1>
          <p className="text-muted-foreground">
            Theo dõi danh mục đầu tư và lợi nhuận của bạn.
          </p>
        </div>
        <TransactionForm onSuccess={fetchData} />
      </div>

      {/* Loading State */}
      {loading && transactions.length === 0 ? (
        <div className="flex justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {/* Overview Cards */}
          <Overview
            totalChi={totalChi}
            totalInvested={totalInvested}
            marketPrice={marketPrice}
            setMarketPrice={handlePriceChange}
          />

          {/* Transactions List */}
          <TransactionList
            transactions={transactions}
            marketPrice={marketPrice}
            onUpdate={fetchData}
          />
        </>
      )}
    </div>
  );
}
