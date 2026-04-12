import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import clsx from "clsx";
import { Droplet, Home, Zap } from "lucide-react";

interface BillResultProps {
  month: string;
  electricOld: number;
  electricNew: number;
  waterOld: number;
  waterNew: number;
  rentAmount: number;
  electricAmount: number;
  waterAmount: number;
  borderLess?: boolean;
  customFees?: {
    name: string;
    amount: number;
    quantity?: number;
  }[];
  totalAmount: number;
}

export default function BillResult({
  borderLess,
  month,
  electricOld,
  electricNew,
  waterOld,
  waterNew,
  rentAmount,
  electricAmount,
  waterAmount,
  customFees = [],
  totalAmount,
}: BillResultProps) {
  const electricUsed = electricNew - electricOld;
  const waterUsed = waterNew - waterOld;

  return (
    <Card
      className={clsx(
        "bg-white/80 backdrop-blur-sm  shadow-xl shadow-blue-500/5",
        {
          "border-none! p-0": borderLess,
          "border-blue-100": !borderLess,
        },
      )}
    >
      <CardContent className="space-y-4">
        {/* Meter Summary */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-yellow-50 rounded-xl p-3 border border-yellow-100">
            <div className="flex items-center gap-1.5 mb-1">
              <Zap className="w-3.5 h-3.5 text-yellow-600 fill-yellow-600" />
              <span className="text-xs font-medium text-yellow-700">Điện</span>
            </div>
            <p className="font-bold text-lg text-gray-900">
              {new Intl.NumberFormat("vi-VN").format(electricUsed)}{" "}
              <span className="text-xs font-normal text-gray-500">kWh</span>
            </p>
            <p className="text-[10px] text-gray-400 mt-1">
              {new Intl.NumberFormat("vi-VN").format(electricOld)} →{" "}
              {new Intl.NumberFormat("vi-VN").format(electricNew)}
            </p>
          </div>

          <div className="bg-blue-50 rounded-xl p-3 border border-blue-100">
            <div className="flex items-center gap-1.5 mb-1">
              <Droplet className="w-3.5 h-3.5 text-blue-600 fill-blue-600" />
              <span className="text-xs font-medium text-blue-700">Nước</span>
            </div>
            <p className="font-bold text-lg text-gray-900">
              {new Intl.NumberFormat("vi-VN").format(waterUsed)}{" "}
              <span className="text-xs font-normal text-gray-500">m³</span>
            </p>
            <p className="text-[10px] text-gray-400 mt-1">
              {new Intl.NumberFormat("vi-VN").format(waterOld)} →{" "}
              {new Intl.NumberFormat("vi-VN").format(waterNew)}
            </p>
          </div>
        </div>

        {/* Bill Details */}
        <div className="space-y-3 pt-2">
          <div className="flex justify-between items-center text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <div className="w-6 h-6 rounded-md bg-gray-100 flex items-center justify-center">
                <Home className="w-3.5 h-3.5 text-gray-500" />
              </div>
              Tiền nhà
            </div>
            <span className="font-semibold text-gray-900">
              {formatCurrency(rentAmount)}
            </span>
          </div>

          <div className="flex justify-between items-center text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <div className="w-6 h-6 rounded-md bg-yellow-100 flex items-center justify-center">
                <Zap className="w-3.5 h-3.5 text-yellow-600" />
              </div>
              Tiền điện
            </div>
            <span className="font-semibold text-gray-900">
              {formatCurrency(electricAmount)}
            </span>
          </div>

          <div className="flex justify-between items-center text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <div className="w-6 h-6 rounded-md bg-blue-100 flex items-center justify-center">
                <Droplet className="w-3.5 h-3.5 text-blue-600" />
              </div>
              Tiền nước
            </div>
            <span className="font-semibold text-gray-900">
              {formatCurrency(waterAmount)}
            </span>
          </div>

          {customFees.map((fee, index) => (
            <div
              key={index}
              className="flex justify-between items-center text-sm"
            >
              <div className="flex items-center gap-2 text-muted-foreground">
                <div className="w-6 h-6 rounded-md bg-gray-100 flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                </div>
                {fee.name}{" "}
                {fee.quantity && fee.quantity > 1 && (
                  <span className="text-xs text-gray-400">x{fee.quantity}</span>
                )}
              </div>
              <span className="font-semibold text-gray-900">
                {formatCurrency(fee.amount)}
              </span>
            </div>
          ))}
        </div>

        {/* Total */}
        <div className="pt-2">
          <div className="bg-gradient-to-r from-primary to-primary/90 rounded-xl p-4 text-white shadow-lg shadow-primary/25">
            <div className="flex justify-between items-center">
              <span className="text-primary-foreground/90 font-medium">
                Tổng cộng
              </span>
              <span className="text-2xl font-bold tracking-tight">
                {formatCurrency(totalAmount)}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
