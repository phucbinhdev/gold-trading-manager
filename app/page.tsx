"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { Database } from "@/lib/supabase/types";
import { Overview } from "@/components/gold/Overview";
import { TransactionForm } from "@/components/gold/TransactionForm";
import { TransactionList } from "@/components/gold/TransactionList";
import { Plus, Wallet } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/button";
import { Loading, TabletSplitLayout } from "@/components/ui/PageLayout";
import { useWebHaptics } from "web-haptics/react";

type Transaction = Database["public"]["Tables"]["transactions"]["Row"];

export default function Home() {
  const haptics = useWebHaptics();
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
    <div className="page-shell app-container space-y-8 bg-background font-sans text-foreground">
      <PageHeader 
        title="Quản Lý Vàng" 
        subtitle="Xin chào! Chúc bạn ngày mới tốt lành."
        icon={<Wallet className="w-6 h-6" />}
        iconColor="bg-gradient-to-br from-yellow-400 to-amber-600"
        showSettings
      />

      {loading && transactions.length === 0 ? (
        <Loading />
      ) : (
        <TabletSplitLayout
          sidebar={
            <Overview
              totalChi={totalChi}
              totalInvested={totalInvested}
              marketPrice={marketPrice}
              setMarketPrice={handlePriceChange}
            />
          }
        >
          <TransactionList
            transactions={transactions}
            marketPrice={marketPrice}
            onUpdate={fetchData}
          />
        </TabletSplitLayout>
      )}

      <Button
        onClick={() => {
          void haptics.trigger("medium");
          setIsAddOpen(true);
        }}
        size="icon"
        data-haptic="medium"
        className="fixed bottom-[calc(env(safe-area-inset-bottom)+5.75rem)] right-4 z-50 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-[0_18px_34px_-18px_rgba(0,0,0,0.55)] hover:bg-primary/90 md:right-[calc((100vw-min(100vw,72rem))/2+1.5rem)]"
        aria-label="Thêm giao dịch vàng"
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
