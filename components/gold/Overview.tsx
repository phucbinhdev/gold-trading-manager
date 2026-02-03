"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency, formatGoldWeight } from "@/lib/utils";
import {
  ArrowUpRight,
  ArrowDownRight,
  Coins,
  Wallet,
  TrendingUp,
} from "lucide-react";

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

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* 1. Total Gold Holding */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Tổng Lượng Vàng</CardTitle>
          <Coins className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalChi} Chỉ</div>
          <p className="text-xs text-muted-foreground">
            {formatGoldWeight(totalChi)}
          </p>
        </CardContent>
      </Card>

      {/* 2. Total Invested */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Tổng Vốn Đầu Tư</CardTitle>
          <Wallet className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatCurrency(totalInvested)}
          </div>
          <p className="text-xs text-muted-foreground">
            Trung bình:{" "}
            {totalChi > 0 ? formatCurrency(totalInvested / totalChi) : 0} / Chỉ
          </p>
        </CardContent>
      </Card>

      {/* 3. Current Value (Dynamic) */}
      <Card className="bg-primary/5 border-primary/20">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-primary">
            Giá Trị Hiện Tại
          </CardTitle>
          <TrendingUp className="h-4 w-4 text-primary" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-primary">
            {formatCurrency(currentValue)}
          </div>
          <div className="mt-2 space-y-1">
            <Label
              htmlFor="market-price"
              className="text-xs text-muted-foreground"
            >
              Giá thị trường (VND/Chỉ):
            </Label>
            <Input
              id="market-price"
              type="number"
              value={marketPrice || ""}
              onChange={(e) => setMarketPrice(Number(e.target.value))}
              className="h-8 text-right font-medium"
              placeholder="Nhập giá vàng..."
            />
          </div>
        </CardContent>
      </Card>

      {/* 4. Profit / Loss */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Lợi Nhuận Tạm Tính
          </CardTitle>
          {profit >= 0 ? (
            <ArrowUpRight className="h-4 w-4 text-green-500" />
          ) : (
            <ArrowDownRight className="h-4 w-4 text-red-500" />
          )}
        </CardHeader>
        <CardContent>
          <div
            className={`text-2xl font-bold ${profit >= 0 ? "text-green-600" : "text-red-600"}`}
          >
            {profit >= 0 ? "+" : ""}
            {formatCurrency(profit)}
          </div>
          <p
            className={`text-xs ${profit >= 0 ? "text-green-600/80" : "text-red-600/80"}`}
          >
            {profitPercent.toFixed(2)}% so với vốn
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
