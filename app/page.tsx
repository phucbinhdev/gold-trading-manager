"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { Database } from "@/lib/supabase/types";
import { Overview } from "@/components/gold/Overview";
import { TransactionForm } from "@/components/gold/TransactionForm";
import { TransactionList } from "@/components/gold/TransactionList";
import { BottomNav } from "@/components/gold/BottomNav";
import { BudgetPage } from "@/components/budget/BudgetPage";
import { WishlistPage } from "@/components/wishlist/WishlistPage";
import { DiaryPage } from "@/components/diary/DiaryPage";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import dynamic from "next/dynamic";

const RoomRentalPage = dynamic(() => import("@/app/room-rental/page").then(mod => ({default: mod.default})), {loading: () => <div className="flex justify-center items-center h-screen"><Loader2 className="animate-spin" /></div>});

type Transaction = Database["public"]["Tables"]["transactions"]["Row"];

export default function Home() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [marketPrice, setMarketPrice] = useState<number>(8000000); // Default 8,000,000
  const [loading, setLoading] = useState(true);

  // Mobile Navigation State
  type TabType = "home" | "history" | "profile" | "budget" | "wishlist" | "diary" | "room-rental";
  
  // Restore last active tab from localStorage
  const getInitialTab = (): TabType => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("lastActiveTab");
      if (saved && ["home", "history", "budget", "room-rental"].includes(saved)) {
        return saved as TabType;
      }
    }
    return "home";
  };

  const [currentTab, setCurrentTab] = useState<TabType>(getInitialTab);
  const [isAddOpen, setIsAddOpen] = useState(false);

  // Save tab to localStorage when changed
  const handleTabChange = (tab: TabType) => {
    setCurrentTab(tab);
    if (typeof window !== "undefined") {
      localStorage.setItem("lastActiveTab", tab);
    }
  };

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
    <div className="min-h-screen bg-background font-sans text-foreground pb-24 relative max-w-md mx-auto">
      {/* Main Content Area */}
      <main className="px-4 py-6 space-y-8 animate-in fade-in duration-500">
        {loading && transactions.length === 0 ? (
          <div className="flex justify-center p-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* Logic for Tabs */}

            {/* BUDGET TAB */}
            {currentTab === "budget" && <BudgetPage />}

            {/* WISHLIST TAB */}
            {currentTab === "wishlist" && <WishlistPage />}

            {/* DIARY TAB */}
            {currentTab === "diary" && <DiaryPage />}

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
                      onClick={() => handleTabChange("history")}
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

            {/* ROOM RENTAL TAB */}
            {currentTab === "room-rental" && (
              <RoomRentalPage />
            )}
          </>
        )}
      </main>

      {/* Floating Action Button (FAB) - Hide on Budget, Wishlist, Diary & Room Rental Tab */}
      {currentTab !== "budget" && currentTab !== "wishlist" && currentTab !== "diary" && currentTab !== "room-rental" && (
        <Button
          onClick={() => setIsAddOpen(true)}
          size="icon"
          className="fixed bottom-20 right-4 z-50 h-14 w-14 rounded-full shadow-lg bg-primary hover:bg-primary/90 text-primary-foreground"
        >
          <Plus className="h-8 w-8" />
        </Button>
      )}

      {/* Transaction Form (Controlled) */}
      <TransactionForm
        open={isAddOpen}
        onOpenChange={setIsAddOpen}
        onSuccess={fetchData}
      />

      {/* Mobile Bottom Navigation */}
      <BottomNav currentTab={currentTab} onTabChange={handleTabChange} />
    </div>
  );
}
