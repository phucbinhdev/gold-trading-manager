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
import { NumericFormat } from "react-number-format";
import { useWebHaptics } from "web-haptics/react";

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
  const haptics = useWebHaptics();

  const handlePriceSave = () => {
    setMarketPrice(tempPrice);
    void haptics.trigger("success");
    setIsEditingPrice(false);
  };

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#F8DA3B] via-[#F4D125] to-[#EAA20D] p-6 text-yellow-950 shadow-[0_24px_70px_-36px_rgba(146,91,0,0.75),inset_0_1px_0_rgba(255,255,255,0.45)] ring-1 ring-black/10">
        {/* Decorative Circles */}
        <div className="absolute -right-16 -top-14 h-44 w-44 rounded-full bg-white/30 blur-3xl" />
        <div className="absolute -bottom-10 -left-10 h-36 w-36 rounded-full bg-yellow-800/10 blur-2xl" />
        <div className="absolute inset-x-5 top-0 h-px bg-white/55" />

        {/* Toggle Privacy Button */}
        {/* <button
          onClick={() => setShowMoney(!showMoney)}
          className="absolute top-4 right-4 p-2 rounded-full bg-white/20 backdrop-blur-sm hover:bg-white/30 transition-colors z-20"
        >
          {showMoney ? (
            <Eye className="w-5 h-5 text-yellow-900" />
          ) : (
            <EyeOff className="w-5 h-5 text-yellow-900" />
          )}
        </button> */}

        <div className="relative">
          {/* Header */}
          <div className="flex justify-between items-start gap-4 mb-2">
            <div>
              <p className="text-sm font-semibold opacity-75 uppercase tracking-wider">
                Tổng Tài Sản
              </p>
              <h2 className="mt-1 text-4xl font-bold tracking-tight numeric-stable">
                {showMoney ? formatCurrency(currentValue) : "******"}
              </h2>
            </div>
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/35 shadow-[inset_0_1px_0_rgba(255,255,255,0.45),0_10px_25px_-18px_rgba(0,0,0,0.7)] backdrop-blur-sm image-outline">
              <Wallet className="w-6 h-6 text-yellow-900" />
            </div>
          </div>

          {/* Profit Pill */}
          <div className="mt-2 inline-flex min-h-10 items-center gap-2 rounded-full bg-white/35 px-3.5 py-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.42)] ring-1 ring-black/5 backdrop-blur-md">
            <span className="text-xs font-semibold uppercase opacity-70">
              Lợi nhuận
            </span>
            <div
              className={`flex items-center gap-1 text-sm font-bold numeric-stable ${
                profit >= 0 ? "text-green-800" : "text-red-800"
              }`}
            >
              {showMoney ? (
                <>
                  {profit >= 0 ? "+" : ""}
                  {formatCurrency(profit)}
                  {profit >= 0 ? (
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  ) : (
                    <ArrowDownRight className="w-3.5 h-3.5" />
                  )}
                </>
              ) : (
                "******"
              )}
            </div>
          </div>

          {/* Divider */}
          <div className="my-6 border-t border-yellow-900/10" />

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-white/20 p-3 ring-1 ring-black/5">
              <p className="text-xs font-medium opacity-70 mb-1">
                Khối lượng vàng
              </p>
              <p className="text-base font-bold numeric-stable">{totalChi} Chỉ</p>
              <p className="text-xs opacity-60 mt-0.5">
                Vốn: {showMoney ? formatCurrency(totalInvested) : "******"}
              </p>
            </div>

            <div className="rounded-2xl bg-white/20 p-3 ring-1 ring-black/5">
              <p className="text-xs font-medium opacity-70 mb-1">
                Giá thị trường
              </p>
              <div className="flex items-center gap-1.5">
                <p className="text-base font-bold numeric-stable">
                  {showMoney ? formatCurrency(marketPrice) : "******"}
                </p>
                <Dialog open={isEditingPrice} onOpenChange={setIsEditingPrice}>
                  <DialogTrigger asChild>
                    <button className="tap-target inline-grid place-items-center rounded-full transition-[background-color,transform] duration-150 ease-out hover:bg-black/5 active:scale-[0.96] motion-reduce:transition-none motion-reduce:active:scale-100" aria-label="Cập nhật giá vàng" data-haptic="medium">
                      <Edit2 className="w-4 h-4 opacity-70" />
                    </button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>Cập nhật giá vàng</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-6 py-4">
                      <div className="space-y-3">
                        <NumericFormat
                          customInput={Input}
                          thousandSeparator="."
                          decimalSeparator=","
                          decimalScale={0}
                          allowNegative={false}
                          placeholder="8.000.000"
                          value={tempPrice}
                          onValueChange={(values) => {
                            setTempPrice(values.floatValue || 0);
                          }}
                          className="text-center text-2xl font-bold h-16"
                          inputMode="decimal"
                        />
                        <p className="text-sm text-center text-muted-foreground">
                          VND / Chỉ
                        </p>
                      </div>
                      <Button
                        onClick={handlePriceSave}
                        data-haptic="success"
                        className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-12 text-lg"
                      >
                        Lưu Thay Đổi
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
              <p className="text-xs opacity-60 mt-0.5">
                {profitPercent >= 0 ? "+" : ""}
                <span className="numeric-stable">{profitPercent.toFixed(2)}%</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
