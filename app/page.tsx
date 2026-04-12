"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { Database } from "@/lib/supabase/types";
import { Overview } from "@/components/gold/Overview";
import { TransactionForm } from "@/components/gold/TransactionForm";
import { TransactionList } from "@/components/gold/TransactionList";
import { Loader2, Plus, Wallet } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/button";

type Transaction = Database["public"]["Tables"]["transactions"]["Row"];

export default function Home() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [marketPrice, setMarketPrice] = useState<number>(8000000);
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: txData, error: txError } = await supabase
        .from("transactions")
        .select("*")
        .order("transaction_date", { ascending: false });

      if (txError) throw txError;
      setTransactions(txData || []);

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

  const handlePriceChange = async (newPrice: number) => {
    setMarketPrice(newPrice);
    await supabase.from("app_settings").upsert({
      key: "current_gold_price",
      value: String(newPrice),
      updated_at: new Date().toISOString(),
    });
  };

  useEffect(() => {
    fetchData();
  }, []);

  const totalChi = transactions.reduce((acc, t) => acc + t.amount_chi, 0);
  const totalInvested = transactions.reduce(
    (acc, t) => acc + (t.total_price || t.amount_chi * t.price_per_chi),
    0,
  );

  return (
    <div className="min-h-screen bg-background font-sans text-foreground pb-24 px-4 py-6 space-y-8">
      <PageHeader 
        title="Quản Lý Vàng" 
        subtitle="Xin chào! Chúc bạn ngày mới tốt lành."
        icon={<Wallet className="w-6 h-6" />}
        iconColor="bg-gradient-to-br from-yellow-400 to-amber-600"
        showSettings
      />

      {loading && transactions.length === 0 ? (
        <div className="flex justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          <Overview
            totalChi={totalChi}
            totalInvested={totalInvested}
            marketPrice={marketPrice}
            setMarketPrice={handlePriceChange}
          />

          <div>
            <div className="flex items-center justify-between mb-2 px-1">
              <h3 className="font-bold text-lg">Giao dịch gần đây</h3>
              <Button
                variant="link"
                size="sm"
                onClick={() => window.location.href = "/history"}
                className="text-primary pr-0"
              >
                Xem tất cả
              </Button>
            </div>
            <TransactionList
              transactions={transactions.slice(0, 3)}
              marketPrice={marketPrice}
              onUpdate={fetchData}
            />
          </div>
        </>
      )}

      <Button
        onClick={() => setIsAddOpen(true)}
        size="icon"
        className="fixed bottom-20 right-4 z-50 h-14 w-14 rounded-full shadow-lg bg-primary hover:bg-primary/90 text-primary-foreground"
      >
        <Plus className="h-8 w-8" />
      </Button>

      <TransactionForm
        open={isAddOpen}
        onOpenChange={setIsAddOpen}
        onSuccess={fetchData}
      />
    </div>
  );
}