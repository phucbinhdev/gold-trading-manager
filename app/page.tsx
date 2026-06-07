"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
import { PullToRefresh } from "@/components/navigation/PullToRefresh";
import { queryKeys } from "@/lib/query-keys";

type Transaction = Database["public"]["Tables"]["transactions"]["Row"];

export default function Home() {
  const haptics = useWebHaptics();
  const queryClient = useQueryClient();
  const [isAddOpen, setIsAddOpen] = useState(false);

  const transactionsQuery = useQuery({
    queryKey: queryKeys.gold.transactions(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .order("transaction_date", { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  const marketPriceQuery = useQuery({
    queryKey: queryKeys.gold.currentPrice(),
    queryFn: async () => {
      const { data } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "current_gold_price")
        .single();

      return data?.value ? Number(data.value) : 8000000;
    },
  });

  const transactions: Transaction[] = transactionsQuery.data || [];
  const marketPrice = marketPriceQuery.data || 8000000;
  const loading =
    (transactionsQuery.isLoading || marketPriceQuery.isLoading) &&
    transactions.length === 0;

  const refreshData = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.gold.transactions() }),
      queryClient.invalidateQueries({ queryKey: queryKeys.gold.currentPrice() }),
    ]);
  };

  const handlePriceChange = async (newPrice: number) => {
    queryClient.setQueryData(queryKeys.gold.currentPrice(), newPrice);
    await supabase.from("app_settings").upsert({
      key: "current_gold_price",
      value: String(newPrice),
      updated_at: new Date().toISOString(),
    });
    await queryClient.invalidateQueries({
      queryKey: queryKeys.gold.currentPrice(),
    });
  };

  const totalChi = transactions.reduce((acc, t) => acc + t.amount_chi, 0);
  const totalInvested = transactions.reduce(
    (acc, t) => acc + (t.total_price || t.amount_chi * t.price_per_chi),
    0,
  );

  return (
    <PullToRefresh
      onRefresh={refreshData}
      refreshing={transactionsQuery.isFetching || marketPriceQuery.isFetching}
      className="page-shell app-container space-y-8 bg-background font-sans text-foreground"
    >
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
            onUpdate={refreshData}
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
        onSuccess={refreshData}
      />
    </PullToRefresh>
  );
}
