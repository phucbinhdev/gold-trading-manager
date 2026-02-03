"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/utils";
import { ArrowDownRight, ArrowUpRight, Edit2, Wallet } from "lucide-react";
import { useState } from "react";

interface OverviewProps {
  totalChi: number;
  totalInvested: number;
  marketPrice: number; // VND per Chi
  setMarketPrice: (price: number) => void;
}

export function Overview({
  totalChi,
  totalInvested,
  marketPrice,
  setMarketPrice,
}: OverviewProps) {
  const currentValue = totalChi * marketPrice;
  const profit = currentValue - totalInvested;
  const profitPercent = totalInvested > 0 ? (profit / totalInvested) * 100 : 0;
  const [isEditingPrice, setIsEditingPrice] = useState(false);
  const [tempPrice, setTempPrice] = useState(marketPrice);

  const handlePriceSave = () => {
    setMarketPrice(tempPrice);
    setIsEditingPrice(false);
  };

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#F4D125] to-[#EDB310] p-6 text-yellow-950 shadow-xl ring-1 ring-yellow-400/50">
        {/* Decorative Circles */}
        <div className="absolute -top-12 -right-12 h-40 w-40 rounded-full bg-white/20 blur-2xl" />
        <div className="absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-yellow-600/10 blur-xl" />

        <div className="relative">
          {/* Header */}
          <div className="flex justify-between items-start mb-2">
            <div>
              <p className="text-sm font-semibold opacity-75 uppercase tracking-wider">
                Tổng Tài Sản
              </p>
              <h2 className="text-4xl font-bold tracking-tight mt-1">
                {formatCurrency(currentValue)}
              </h2>
            </div>
            <div className="bg-white/30 p-2.5 rounded-2xl shadow-sm backdrop-blur-sm">
              <Wallet className="w-6 h-6 text-yellow-900" />
            </div>
          </div>

          {/* Profit Pill */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/30 backdrop-blur-md border border-white/20 shadow-sm mt-2">
            <span className="text-xs font-semibold uppercase opacity-70">
              Lợi nhuận
            </span>
            <div
              className={`flex items-center gap-1 text-sm font-bold ${
                profit >= 0 ? "text-green-800" : "text-red-800"
              }`}
            >
              {profit >= 0 ? "+" : ""}
              {formatCurrency(profit)}
              {profit >= 0 ? (
                <ArrowUpRight className="w-3.5 h-3.5" />
              ) : (
                <ArrowDownRight className="w-3.5 h-3.5" />
              )}
            </div>
          </div>

          {/* Divider */}
          <div className="my-6 border-t border-yellow-900/10" />

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-8">
            <div>
              <p className="text-xs font-medium opacity-70 mb-1">
                Khối lượng vàng
              </p>
              <p className="text-xl font-bold">{totalChi} Chỉ</p>
              <p className="text-xs opacity-60 mt-0.5">
                Vốn: {formatCurrency(totalInvested)}
              </p>
            </div>

            <div>
              <p className="text-xs font-medium opacity-70 mb-1">
                Giá thị trường
              </p>
              <div className="flex items-center gap-2">
                <p className="text-xl font-bold">
                  {formatCurrency(marketPrice)}
                </p>
                <Dialog open={isEditingPrice} onOpenChange={setIsEditingPrice}>
                  <DialogTrigger asChild>
                    <button className="p-1 rounded-full hover:bg-black/5 transition-colors">
                      <Edit2 className="w-4 h-4 opacity-70" />
                    </button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-xs">
                    <DialogHeader>
                      <DialogTitle>Cập nhật giá vàng</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                      <div className="space-y-2">
                        <Input
                          type="number"
                          value={tempPrice}
                          onChange={(e) => setTempPrice(Number(e.target.value))}
                          className="text-center text-lg font-bold"
                        />
                        <p className="text-xs text-center text-muted-foreground">
                          VND / Chỉ
                        </p>
                      </div>
                      <Button
                        onClick={handlePriceSave}
                        className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                      >
                        Lưu Thay Đổi
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
              <p className="text-xs opacity-60 mt-0.5">
                {profitPercent >= 0 ? "+" : ""}
                {profitPercent.toFixed(2)}%
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
