"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { Database } from "@/lib/supabase/types";
import { Overview } from "@/components/gold/Overview";
import { TransactionForm } from "@/components/gold/TransactionForm";
import { TransactionList } from "@/components/gold/TransactionList";
import { BottomNav } from "@/components/gold/BottomNav";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

type Transaction = Database["public"]["Tables"]["transactions"]["Row"];

export default function Home() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [marketPrice, setMarketPrice] = useState<number>(8000000); // Default 8,000,000
  const [loading, setLoading] = useState(true);

  // Mobile Navigation State
  const [currentTab, setCurrentTab] = useState<"home" | "history" | "profile">(
    "home",
  );
  const [isAddOpen, setIsAddOpen] = useState(false);

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

      // 2. Get Market Price Setting
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

  // Update Market Price in DB
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

  // Calculations
  const totalChi = transactions.reduce((acc, t) => acc + t.amount_chi, 0);
  const totalInvested = transactions.reduce(
    (acc, t) => acc + (t.total_price || t.amount_chi * t.price_per_chi),
    0,
  );

  return (
    <div className="min-h-screen bg-background font-sans text-foreground pb-24 relative">
      {/* Mobile Header */}
      <div className="sticky top-0 z-40 flex items-center justify-between px-6 py-4 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-primary">
            Quản Lý Vàng
          </h1>
          <p className="text-xs text-muted-foreground">
            Xin chào! Chúc bạn ngày mới tốt lành.
          </p>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="px-4 py-6 space-y-8 animate-in fade-in duration-500">
        {loading && transactions.length === 0 ? (
          <div className="flex justify-center p-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* Logic for Tabs */}

            {/* HOME TAB */}
            {currentTab === "home" && (
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
                      onClick={() => setCurrentTab("history")}
                      className="text-primary pr-0"
                    >
                      Xem tất cả
                    </Button>
                  </div>
                  {/* Show only first 5 recent transactions */}
                  <TransactionList
                    transactions={transactions.slice(0, 3)}
                    marketPrice={marketPrice}
                    onUpdate={fetchData}
                  />
                </div>
              </>
            )}

            {/* HISTORY TAB */}
            {currentTab === "history" && (
              <TransactionList
                transactions={transactions}
                marketPrice={marketPrice}
                onUpdate={fetchData}
              />
            )}
          </>
        )}
      </main>

      {/* Floating Action Button (FAB) */}
      <Button
        onClick={() => setIsAddOpen(true)}
        size="icon"
        className="fixed bottom-20 right-4 z-50 h-14 w-14 rounded-full shadow-lg bg-primary hover:bg-primary/90 text-primary-foreground"
      >
        <Plus className="h-8 w-8" />
      </Button>

      {/* Transaction Form (Controlled) */}
      <TransactionForm
        open={isAddOpen}
        onOpenChange={setIsAddOpen}
        onSuccess={fetchData}
      />

      {/* Mobile Bottom Navigation */}
      <BottomNav currentTab={currentTab} onTabChange={setCurrentTab} />
    </div>
  );
}
