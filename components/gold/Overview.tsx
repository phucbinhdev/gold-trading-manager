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
import {
  ArrowDownRight,
  Edit3,
  TrendingUp,
  Eye,
  EyeOff,
  ChevronRight,
} from "lucide-react";
import { useState } from "react";
import { NumericFormat } from "react-number-format";

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
  const [showMoney, setShowMoney] = useState(true);

  const handlePriceSave = () => {
    setMarketPrice(tempPrice);
    setIsEditingPrice(false);
  };

  return (
    <div className="space-y-6">
      {/* Main Glass Card */}
      <div className="relative overflow-hidden rounded-[2.5rem] bg-zinc-900 dark:bg-black p-8 text-white shadow-2xl ring-1 ring-white/10">
        {/* Abstract Background Glows */}
        <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-primary/20 blur-[100px]" />
        <div className="absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-indigo-500/10 blur-[100px]" />
        
        <div className="relative z-10">
          {/* Top Bar */}
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10">
              <div className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-[10px] font-bold uppercase tracking-widest opacity-70">Live Market</span>
            </div>
            <button 
              onClick={() => setShowMoney(!showMoney)}
              className="p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
            >
              {showMoney ? <Eye className="w-4 h-4 opacity-50" /> : <EyeOff className="w-4 h-4 opacity-50" />}
            </button>
          </div>

          {/* Balance Section */}
          <div className="space-y-1">
            <p className="text-sm font-medium text-zinc-400">Tổng tài sản vàng</p>
            <div className="flex items-baseline gap-2">
               <h2 className="text-5xl font-black tracking-tighter text-white">
                {showMoney ? formatCurrency(currentValue).replace("₫", "") : "••••••"}
                <span className="text-xl ml-1 text-primary font-bold">₫</span>
              </h2>
            </div>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 gap-4 mt-10">
            {/* Profit Card */}
            <div className="bg-white/5 border border-white/10 rounded-3xl p-4">
               <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2">Lợi nhuận</p>
               <div className="flex items-center gap-1.5">
                <span className={cn("text-lg font-bold", profit >= 0 ? "text-green-400" : "text-red-400")}>
                  {showMoney ? `${profit >= 0 ? "+" : ""}${formatCurrency(profit)}` : "****"}
                </span>
                {profit >= 0 ? <TrendingUp className="w-4 h-4 text-green-400" /> : <ArrowDownRight className="w-4 h-4 text-red-400" />}
               </div>
               <div className={cn("text-[10px] font-medium mt-1 inline-block px-1.5 py-0.5 rounded-md", profit >= 0 ? "bg-green-400/10 text-green-400" : "bg-red-400/10 text-red-400")}>
                  {profitPercent >= 0 ? "+" : ""}{profitPercent.toFixed(2)}%
               </div>
            </div>

            {/* Volume Card */}
            <div className="bg-white/5 border border-white/10 rounded-3xl p-4">
               <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2">Đang nắm giữ</p>
               <div className="flex items-center gap-2">
                <span className="text-xl font-bold italic text-primary">{totalChi}</span>
                <span className="text-xs font-semibold text-zinc-400">Chỉ</span>
               </div>
               <p className="text-[10px] text-zinc-500 mt-2 font-medium">
                 Vốn: {showMoney ? formatCurrency(totalInvested) : "****"}
               </p>
            </div>
          </div>

          {/* Market Price Action */}
          <Dialog open={isEditingPrice} onOpenChange={setIsEditingPrice}>
            <DialogTrigger asChild>
              <button className="w-full mt-6 group flex items-center justify-between bg-primary p-4 rounded-2xl text-black hover:bg-primary/90 transition-all active:scale-[0.98]">
                <div className="flex items-center gap-3 text-black">
                  <div className="bg-black/10 p-2 rounded-xl">
                    <Edit3 className="w-4 h-4 text-black" />
                  </div>
                  <div className="text-left">
                    <p className="text-[10px] font-bold uppercase opacity-60 leading-none mb-1">Giá thị trường hiện tại</p>
                    <p className="text-lg font-black leading-none italic">{formatCurrency(marketPrice)}</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 opacity-40 group-hover:translate-x-1 transition-transform" />
              </button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md border-zinc-800 bg-zinc-950 text-white rounded-[2rem]">
              <DialogHeader>
                <DialogTitle className="text-center text-xl font-black italic text-white">Cập nhật giá thị trường</DialogTitle>
              </DialogHeader>
              <div className="space-y-6 py-6">
                <div className="relative">
                  <NumericFormat
                    customInput={Input}
                    thousandSeparator="."
                    decimalSeparator=","
                    decimalScale={0}
                    allowNegative={false}
                    placeholder="8.500.000"
                    value={tempPrice}
                    onValueChange={(values) => setTempPrice(values.floatValue || 0)}
                    className="text-center text-4xl font-black bg-white/5 border-white/10 h-24 rounded-3xl text-primary focus:ring-primary"
                    inputMode="decimal"
                  />
                  <p className="absolute bottom-4 left-0 right-0 text-center text-[10px] font-bold text-zinc-500 uppercase tracking-widest pointer-events-none">VNĐ / CHỈ</p>
                </div>
                <Button
                  onClick={handlePriceSave}
                  className="w-full bg-primary text-black hover:bg-primary/90 h-14 rounded-2xl text-lg font-black italic shadow-lg shadow-primary/20"
                >
                  LƯU THÔNG TIN
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
}

// Helper to use cn from within the file since it's common
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
