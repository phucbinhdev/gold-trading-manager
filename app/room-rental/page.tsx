"use client";

import BillResult from "@/components/BillResult";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState, Loading, TabletSplitLayout } from "@/components/ui/PageLayout";
import {
  createRecord,
  createRecordCustomFees,
  getActiveCustomFees,
  getLatestRecord,
  getSettings,
} from "@/lib/supabase";
import type { CalculationResult, CustomFee, Settings } from "@/types";
import { formatCurrency } from "@/lib/utils";
import {
  Calendar,
  ChevronRight,
  Droplet,
  Lightbulb,
  Receipt,
  Save,
  Settings as SettingsIcon,
  Zap,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useWebHaptics } from "web-haptics/react";
import { PullToRefresh } from "@/components/navigation/PullToRefresh";
import { useScreenState } from "@/lib/hooks/use-screen-state";
import { queryKeys } from "@/lib/query-keys";

const getDefaultMonth = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
};

export default function RoomRentalPage() {
  const router = useRouter();
  const haptics = useWebHaptics();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);

  // Form state
  const [month, setMonth] = useScreenState("room-rental:month", getDefaultMonth());
  const [electricOld, setElectricOld] = useScreenState("room-rental:electric-old", "");
  const [electricNew, setElectricNew] = useScreenState("room-rental:electric-new", "");
  const [waterOld, setWaterOld] = useScreenState("room-rental:water-old", "");
  const [waterNew, setWaterNew] = useScreenState("room-rental:water-new", "");
  const [customFeeQuantities, setCustomFeeQuantities] = useScreenState<
    Record<string, string>
  >("room-rental:custom-fee-quantities", {});

  // Calculation result
  const [calculationResult, setCalculationResult] =
    useState<CalculationResult | null>(null);

  // Validation warnings
  const [warnings, setWarnings] = useState<string[]>([]);

  const settingsQuery = useQuery({
    queryKey: queryKeys.roomRental.settings(),
    queryFn: getSettings,
  });
  const activeFeesQuery = useQuery({
    queryKey: queryKeys.roomRental.activeCustomFees(),
    queryFn: getActiveCustomFees,
  });
  const latestRecordQuery = useQuery({
    queryKey: queryKeys.roomRental.latestRecord(),
    queryFn: getLatestRecord,
  });

  const settings: Settings | null = settingsQuery.data || null;
  const customFees: CustomFee[] = activeFeesQuery.data || [];
  const loading =
    (settingsQuery.isLoading ||
      activeFeesQuery.isLoading ||
      latestRecordQuery.isLoading) &&
    !settingsQuery.data &&
    !activeFeesQuery.data;

  async function refreshData() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.roomRental.settings() }),
      queryClient.invalidateQueries({
        queryKey: queryKeys.roomRental.activeCustomFees(),
      }),
      queryClient.invalidateQueries({
        queryKey: queryKeys.roomRental.latestRecord(),
      }),
    ]);
  }

  useEffect(() => {
    const latestData = latestRecordQuery.data;

    if (!electricOld) {
      setElectricOld(latestData ? latestData.electric_new.toString() : "0");
    }
    if (!waterOld) {
      setWaterOld(latestData ? latestData.water_new.toString() : "0");
    }
  }, [electricOld, latestRecordQuery.data, setElectricOld, setWaterOld, waterOld]);

  useEffect(() => {
    setCustomFeeQuantities((current) => {
      const next = { ...current };
      customFees.forEach((fee) => {
        if (fee.type === "unit" && !next[fee.id]) {
          next[fee.id] = "1";
        }
      });
      return next;
    });
  }, [customFees, setCustomFeeQuantities]);

  function calculateTotal() {
    if (!settings) {
      void haptics.trigger("warning");
      toast.warning("Vui lòng cấu hình giá trước");
      router.push("/config");
      return;
    }

    const electricOldNum = parseFloat(electricOld) || 0;
    const electricNewNum = parseFloat(electricNew) || 0;
    const waterOldNum = parseFloat(waterOld) || 0;
    const waterNewNum = parseFloat(waterNew) || 0;

    // Validation
    const newWarnings: string[] = [];
    if (electricNewNum < electricOldNum) {
      newWarnings.push("Số điện mới không được nhỏ hơn số điện cũ");
    }
    if (waterNewNum < waterOldNum) {
      newWarnings.push("Số nước mới không được nhỏ hơn số nước cũ");
    }
    setWarnings(newWarnings);

    // Calculate usage
    const electricUsed = Math.max(0, electricNewNum - electricOldNum);
    const waterUsed = Math.max(0, waterNewNum - waterOldNum);

    // Calculate amounts
    const rentAmount = settings.rent_price;
    const electricAmount = electricUsed * settings.electric_price;
    const waterAmount = waterUsed * settings.water_price;

    // Calculate custom fees
    const customFeesDetails = customFees.map((fee) => {
      const quantity =
        fee.type === "unit"
          ? parseFloat(customFeeQuantities[fee.id] || "1")
          : 1;
      const amount =
        fee.type === "fixed"
          ? fee.fixed_amount || 0
          : (fee.unit_price || 0) * quantity;

      return {
        fee_id: fee.id,
        fee_name: fee.name,
        quantity,
        amount,
      };
    });

    const customFeesTotal = customFeesDetails.reduce(
      (sum, fee) => sum + fee.amount,
      0,
    );

    // Total
    const totalAmount =
      rentAmount + electricAmount + waterAmount + customFeesTotal;

    const result: CalculationResult = {
      rent_amount: rentAmount,
      electric_used: electricUsed,
      electric_amount: electricAmount,
      water_used: waterUsed,
      water_amount: waterAmount,
      custom_fees_total: customFeesTotal,
      custom_fees_details: customFeesDetails,
      total_amount: totalAmount,
    };

    setCalculationResult(result);
    void haptics.trigger(newWarnings.length > 0 ? "warning" : "success");
  }

  async function handleSave() {
    if (!settings || !calculationResult) return;

    setSaving(true);

    try {
      const electricOldNum = parseFloat(electricOld) || 0;
      const electricNewNum = parseFloat(electricNew) || 0;
      const waterOldNum = parseFloat(waterOld) || 0;
      const waterNewNum = parseFloat(waterNew) || 0;

      // Create record
      const record = await createRecord({
        month,
        electric_old: electricOldNum,
        electric_new: electricNewNum,
        water_old: waterOldNum,
        water_new: waterNewNum,
        rent_amount: calculationResult.rent_amount,
        electric_amount: calculationResult.electric_amount,
        water_amount: calculationResult.water_amount,
        total_amount: calculationResult.total_amount,
      });

      if (!record) {
        void haptics.trigger("error");
        toast.error("Không thể lưu hóa đơn");
        setSaving(false);
        return;
      }

      // Save custom fees
      if (calculationResult.custom_fees_details.length > 0) {
        const customFeesData = calculationResult.custom_fees_details.map(
          (fee) => ({
            custom_fee_id: fee.fee_id,
            fee_name: fee.fee_name,
            quantity: fee.quantity,
            amount: fee.amount,
          }),
        );

        await createRecordCustomFees(record.id, customFeesData);
      }

      void haptics.trigger("success");
      toast.success("Đã lưu hóa đơn");
      setCalculationResult(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.roomRental.records() }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.roomRental.latestRecord(),
        }),
      ]);
      router.push("/history");
    } catch (error) {
      console.error("Error saving record:", error);
      void haptics.trigger("error");
      toast.error("Không thể lưu hóa đơn");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <Loading />;
  }

  if (!settings) {
    return (
      <PullToRefresh
        onRefresh={refreshData}
        refreshing={
          settingsQuery.isFetching ||
          activeFeesQuery.isFetching ||
          latestRecordQuery.isFetching
        }
        className="page-shell app-container-narrow space-y-6"
      >
        <PageHeader 
          title="Tính tiền trọ" 
          subtitle="Tạo hóa đơn hàng tháng"
          icon={<Receipt className="w-6 h-6 text-white" />}
          iconColor="bg-gradient-to-br from-green-500 to-emerald-600 shadow-green-200"
          showSettings
        />

        <EmptyState
          icon={<SettingsIcon className="h-7 w-7" />}
          title="Chưa có cấu hình giá"
          description="Vui lòng cấu hình giá nhà, điện, nước trước khi tạo hóa đơn."
          action={
            <Button onClick={() => router.push("/config")}>
              Đi đến cấu hình
            </Button>
          }
        />
      </PullToRefresh>
    );
  }

  return (
    <PullToRefresh
      onRefresh={refreshData}
      refreshing={
        settingsQuery.isFetching ||
        activeFeesQuery.isFetching ||
        latestRecordQuery.isFetching
      }
      className="page-shell app-container space-y-6"
    >
        <PageHeader 
          title="Tính tiền trọ" 
          subtitle="Tạo hóa đơn hàng tháng"
          icon={<Receipt className="w-6 h-6 text-white" />}
          iconColor="bg-gradient-to-br from-green-500 to-emerald-600 shadow-green-200"
          showSettings
        />

      <TabletSplitLayout
        className="md:grid-cols-[minmax(20rem,1fr)_minmax(18rem,22rem)]"
        sidebarClassName="space-y-4"
        contentClassName="space-y-4"
        sidebar={
          <>
          {/* Month Selection */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="w-4 h-4 text-green-500" />
                Tháng tính tiền
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Input
                type="month"
                value={month.slice(0, 7)}
                onChange={(e) => setMonth(`${e.target.value}-01`)}
                className="h-12 rounded-xl"
              />
            </CardContent>
          </Card>

          {/* Meter Readings */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Zap className="w-4 h-4 text-yellow-500" />
                Chỉ số công tơ
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 xl:grid-cols-2">
              {/* Electricity */}
              <div className="bg-yellow-50 border border-yellow-100 rounded-2xl p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-yellow-600 fill-yellow-600" />
                  <span className="font-bold text-yellow-800">Điện (kWh)</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-yellow-700 mb-1 block">
                      Chỉ số cũ
                    </label>
                    <Input
                      type="number"
                      value={electricOld}
                      onChange={(e) => setElectricOld(e.target.value)}
                      placeholder="0"
                      className="h-12 bg-white border-yellow-200 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-yellow-700 mb-1 block">
                      Chỉ số mới
                    </label>
                    <Input
                      type="number"
                      value={electricNew}
                      onChange={(e) => setElectricNew(e.target.value)}
                      placeholder="0"
                      className="h-12 bg-white border-yellow-200 rounded-xl"
                    />
                  </div>
                </div>
              </div>

              {/* Water */}
              <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Droplet className="w-5 h-5 text-blue-600 fill-blue-600" />
                  <span className="font-bold text-blue-800">Nước (m³)</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-blue-700 mb-1 block">
                      Chỉ số cũ
                    </label>
                    <Input
                      type="number"
                      value={waterOld}
                      onChange={(e) => setWaterOld(e.target.value)}
                      placeholder="0"
                      className="h-12 bg-white border-blue-200 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-blue-700 mb-1 block">
                      Chỉ số mới
                    </label>
                    <Input
                      type="number"
                      value={waterNew}
                      onChange={(e) => setWaterNew(e.target.value)}
                      placeholder="0"
                      className="h-12 bg-white border-blue-200 rounded-xl"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Custom Fees Quantities */}
          {customFees.filter((fee) => fee.type === "unit").length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <SettingsIcon className="w-4 h-4 text-gray-500" />
                  Chi phí khác
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 xl:grid-cols-2">
                {customFees
                  .filter((fee) => fee.type === "unit")
                  .map((fee) => (
                    <div
                      key={fee.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-xl"
                    >
                      <div>
                        <p className="font-medium text-sm">{fee.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatCurrency(fee.unit_price || 0)}/{fee.unit_name}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">Số lượng:</span>
                        <Input
                          type="number"
                          value={customFeeQuantities[fee.id] || "1"}
                          onChange={(e) =>
                            setCustomFeeQuantities({
                              ...customFeeQuantities,
                              [fee.id]: e.target.value,
                            })
                          }
                          className="w-20 h-10 bg-white rounded-xl"
                          min="0"
                        />
                      </div>
                    </div>
                  ))}
              </CardContent>
            </Card>
          )}

          {/* Warnings */}
          {warnings.length > 0 && (
            <div className="p-4 bg-yellow-50 rounded-xl border border-yellow-100 space-y-2">
              <div className="flex items-start gap-3">
                <Lightbulb className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h3 className="font-semibold text-yellow-800 text-sm">
                    Cảnh báo:
                  </h3>
                  <ul className="text-xs text-yellow-700 space-y-1 list-disc pl-3">
                    {warnings.map((warning, index) => (
                      <li key={index}>{warning}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Calculate Button */}
          <Button
            onClick={calculateTotal}
            data-haptic="medium"
            className="w-full h-12 rounded-2xl bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-medium shadow-lg shadow-green-200 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Zap className="w-5 h-5 mr-2" />
            Tính tiền
          </Button>
          </>
        }
      >
          {/* Calculation Result */}
          {calculationResult && (
            <div className="space-y-4">
              <BillResult
                month={month}
                electricOld={parseFloat(electricOld) || 0}
                electricNew={parseFloat(electricNew) || 0}
                waterOld={parseFloat(waterOld) || 0}
                waterNew={parseFloat(waterNew) || 0}
                rentAmount={calculationResult.rent_amount}
                electricAmount={calculationResult.electric_amount}
                waterAmount={calculationResult.water_amount}
                customFees={calculationResult.custom_fees_details.map((fee) => ({
                  name: fee.fee_name,
                  amount: fee.amount,
                  quantity: fee.quantity,
                }))}
                totalAmount={calculationResult.total_amount}
              />

              {/* Save Button */}
              <Button
                onClick={handleSave}
                disabled={saving}
                data-haptic="success"
                className="w-full h-12 rounded-2xl bg-gray-900 hover:bg-gray-800 text-white font-medium shadow-lg shadow-gray-200 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <Save className="w-5 h-5 mr-2" />
                {saving ? "Đang lưu..." : "Lưu hóa đơn"}
              </Button>
            </div>
          )}
      </TabletSplitLayout>

      {/* Quick Navigation */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 px-1">
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
          <h2 className="font-bold text-sm text-gray-900">Điều hướng nhanh</h2>
        </div>

        <div className="grid gap-3">
          <Button
            variant="outline"
            onClick={() => router.push("/config")}
            className="h-12 rounded-xl bg-purple-50 text-purple-600 hover:bg-purple-100 border-purple-200"
          >
            <SettingsIcon className="w-4 h-4 mr-2" />
            Cấu hình giá
          </Button>
        </div>
      </div>

      {/* Info Note */}
      <div className="p-4 bg-green-50 rounded-xl border border-green-100">
        <div className="flex items-start gap-3">
          <Lightbulb className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h3 className="font-semibold text-green-800 text-sm">
              Hướng dẫn:
            </h3>
            <ul className="text-xs text-green-700 space-y-1 list-disc pl-3">
              <li>Nhập chỉ số công tơ điện và nước mới</li>
              <li>Chỉ số cũ tự động lấy từ tháng trước</li>
              <li>Click &quot;Tính tiền&quot; để xem chi tiết</li>
              <li>Nhấn &quot;Lưu hóa đơn&quot; để lưu vào lịch sử</li>
            </ul>
          </div>
        </div>
      </div>

      </PullToRefresh>
  );
}
