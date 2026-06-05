"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { PageHeader } from "@/components/ui/PageHeader";
import { Loading } from "@/components/ui/PageLayout";
import {
  createCustomFee,
  deleteCustomFee,
  getCustomFees,
  getSettings,
  updateCustomFee,
  upsertSettings,
} from "@/lib/supabase";
import { formatCurrency } from "@/lib/utils";
import type { CustomFee } from "@/types";
import {
  Droplet,
  HomeIcon,
  Lightbulb,
  Plus,
  Save,
  Settings,
  Sparkles,
  Trash2,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";
import { getBanks, type Bank } from "@/lib/vietqr";

export default function ConfigPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [settings, setSettings] = useState({
    rent_price: "",
    electric_price: "",
    water_price: "",
    bank_id: "",
    bank_name: "",
    account_number: "",
    account_name: "",
  });
  const [customFees, setCustomFees] = useState<CustomFee[]>([]);
  const [newFee, setNewFee] = useState({
    name: "",
    type: "fixed" as "fixed" | "unit",
    fixed_amount: "",
    unit_price: "",
    unit_name: "",
  });
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    feeId: string | null;
    feeName: string;
  }>({ isOpen: false, feeId: null, feeName: "" });
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [settingsData, feesData, banksData] = await Promise.all([
        getSettings(),
        getCustomFees(),
        getBanks(),
      ]);

      if (settingsData) {
        setSettings({
          rent_price: settingsData.rent_price.toString(),
          electric_price: settingsData.electric_price.toString(),
          water_price: settingsData.water_price.toString(),
          bank_id: settingsData.bank_id || "",
          bank_name: settingsData.bank_name || "",
          account_number: settingsData.account_number || "",
          account_name: settingsData.account_name || "",
        });
      }

      setCustomFees(feesData);
      setBanks(banksData);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const selectedBank = banks.find((b) => b.bin === settings.bank_id);

      const data = await upsertSettings({
        rent_price: parseFloat(settings.rent_price) || 0,
        electric_price: parseFloat(settings.electric_price) || 0,
        water_price: parseFloat(settings.water_price) || 0,
        bank_id: settings.bank_id,
        bank_name: selectedBank?.shortName || settings.bank_name,
        account_number: settings.account_number,
        account_name: settings.account_name,
      });

      if (data) {
        setMessage({ type: "success", text: "Đã lưu cấu hình thành công!" });
        setTimeout(() => setMessage(null), 3000);
      } else {
        setMessage({ type: "error", text: "Có lỗi xảy ra, vui lòng thử lại." });
      }
    } catch (error) {
      console.error("Error saving settings:", error);
      setMessage({ type: "error", text: "Có lỗi xảy ra, vui lòng thử lại." });
    } finally {
      setSaving(false);
    }
  }

  async function handleAddCustomFee(e: React.FormEvent) {
    e.preventDefault();

    if (!newFee.name) return;

    try {
      const feeData =
        newFee.type === "fixed"
          ? {
              name: newFee.name,
              type: "fixed" as const,
              fixed_amount: parseFloat(newFee.fixed_amount) || 0,
              is_active: true,
            }
          : {
              name: newFee.name,
              type: "unit" as const,
              unit_price: parseFloat(newFee.unit_price) || 0,
              unit_name: newFee.unit_name || "lần",
              is_active: true,
            };

      const created = await createCustomFee(feeData);

      if (created) {
        setCustomFees([...customFees, created]);
        setNewFee({
          name: "",
          type: "fixed",
          fixed_amount: "",
          unit_price: "",
          unit_name: "",
        });
        setMessage({ type: "success", text: "Đã thêm chi phí mới!" });
        setTimeout(() => setMessage(null), 3000);
      }
    } catch (error) {
      console.error("Error adding custom fee:", error);
      setMessage({ type: "error", text: "Có lỗi xảy ra khi thêm chi phí." });
    }
  }

  async function handleToggleFee(id: string, isActive: boolean) {
    try {
      const updated = await updateCustomFee(id, { is_active: !isActive });
      if (updated) {
        setCustomFees(customFees.map((fee) => (fee.id === id ? updated : fee)));
      }
    } catch (error) {
      console.error("Error toggling fee:", error);
    }
  }

  async function handleDeleteFee(id: string, name: string) {
    setDeleteConfirm({ isOpen: true, feeId: id, feeName: name });
  }

  async function confirmDelete() {
    if (!deleteConfirm.feeId) return;

    try {
      const success = await deleteCustomFee(deleteConfirm.feeId);
      if (success) {
        setCustomFees(
          customFees.filter((fee) => fee.id !== deleteConfirm.feeId),
        );
        setMessage({ type: "success", text: "Đã xóa chi phí!" });
        setTimeout(() => setMessage(null), 3000);
      }
    } catch (error) {
      console.error("Error deleting fee:", error);
      setMessage({ type: "error", text: "Có lỗi xảy ra khi xóa chi phí." });
    } finally {
      setDeleteConfirm({ isOpen: false, feeId: null, feeName: "" });
    }
  }

  if (loading) {
    return <Loading />;
  }

  return (
    <div className="page-shell mx-auto max-w-md space-y-6">
      <PageHeader 
        title="Cấu hình giá" 
        subtitle="Thiết lập giá nhà, điện, nước"
        icon={<Settings className="w-6 h-6 text-white" />}
        iconColor="bg-gradient-to-br from-blue-500 to-indigo-500 shadow-blue-200"
      />

      <div className="space-y-4">
        <div className="flex items-center gap-2 px-1">
          <Sparkles className="w-5 h-5 text-yellow-500" />
          <h2 className="text-lg font-bold text-foreground">Cấu hình cơ bản</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Rent Price - Pink Theme */}
          <div className="bg-[#fff1f2] border border-[#ffe4e6] rounded-2xl p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm">
                  <HomeIcon className="w-4 h-4 text-red-400 fill-red-400" />
                </div>
                <span className="font-bold text-[#881337] text-[15px]">
                  Giá nhà
                </span>
              </div>
              <span className="bg-[#ffe4e6] text-[#e11d48] text-xs px-2.5 py-1 rounded-lg font-medium">
                tháng
              </span>
            </div>
            <div className="relative group">
              <Input
                type="number"
                formatCurrency
                value={settings.rent_price}
                onChange={(e) =>
                  setSettings({ ...settings, rent_price: e.target.value })
                }
                placeholder="0"
                className="h-14 border-transparent bg-background/90 pl-5 pr-12 text-lg font-bold text-[#881337] shadow-sm transition-[border-color,box-shadow] placeholder:text-muted-foreground/45 hover:shadow-md focus-visible:ring-[#e11d48] dark:bg-background/80"
              />
              <span className="absolute right-5 top-1/2 -translate-y-1/2 text-[#fb7185] font-bold text-sm pointer-events-none">
                VND
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Electricity - Yellow Theme */}
            <div className="bg-[#fefce8] border border-[#fef9c3] rounded-2xl p-4 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm">
                  <Zap className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                </div>
                <span className="font-bold text-[#713f12] text-[15px]">
                  Điện
                </span>
              </div>
              <div className="relative group">
                <Input
                  type="number"
                  formatCurrency
                  value={settings.electric_price}
                  onChange={(e) =>
                    setSettings({ ...settings, electric_price: e.target.value })
                  }
                  placeholder="0"
                  className="h-14 border-transparent bg-background/90 pl-4 pr-12 text-lg font-bold text-[#713f12] shadow-sm transition-[border-color,box-shadow] placeholder:text-muted-foreground/45 hover:shadow-md focus-visible:ring-[#ca8a04] dark:bg-background/80"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[#facc15] font-bold text-xs pointer-events-none">
                  /kWh
                </span>
              </div>
            </div>

            {/* Water - Blue Theme */}
            <div className="bg-[#eff6ff] border border-[#dbeafe] rounded-2xl p-4 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm">
                  <Droplet className="w-4 h-4 text-blue-500 fill-blue-500" />
                </div>
                <span className="font-bold text-[#1e3a8a] text-[15px]">
                  Nước
                </span>
              </div>
              <div className="relative group">
                <Input
                  type="number"
                  formatCurrency
                  value={settings.water_price}
                  onChange={(e) =>
                    setSettings({ ...settings, water_price: e.target.value })
                  }
                  placeholder="0"
                  className="h-14 border-transparent bg-background/90 pl-4 pr-10 text-lg font-bold text-[#1e3a8a] shadow-sm transition-[border-color,box-shadow] placeholder:text-muted-foreground/45 hover:shadow-md focus-visible:ring-[#2563eb] dark:bg-background/80"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[#60a5fa] font-bold text-xs pointer-events-none">
                  /m³
                </span>
              </div>
            </div>
          </div>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <span className="text-lg">🏦</span>
                Cấu hình Ngân hàng
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium mb-1 inline-block">
                    Ngân hàng
                  </label>
                  <Select
                    value={settings.bank_id}
                    onValueChange={(val) => {
                      const bank = banks.find((b) => b.bin === val);
                      setSettings({
                        ...settings,
                        bank_id: val,
                        bank_name: bank?.shortName || "",
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn ngân hàng" />
                    </SelectTrigger>
                    <SelectContent className="max-h-75">
                      {banks.map((bank) => (
                        <SelectItem key={bank.id} value={bank.bin}>
                          {bank.shortName} - {bank.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium mb-1 inline-block">
                    Số tài khoản
                  </label>
                  <Input
                    placeholder="Nhập số tài khoản"
                    value={settings.account_number}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        account_number: e.target.value,
                      })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium mb-1 inline-block">
                    Tên chủ tài khoản
                  </label>
                  <Input
                    placeholder="NGUYEN VAN A"
                    value={settings.account_name}
                    onChange={(e) =>
                      setSettings({ ...settings, account_name: e.target.value })
                    }
                  />
                </div>

                {settings.bank_id && settings.account_number && (
                  <div className="mt-2 flex flex-col items-center rounded-2xl bg-muted/45 p-4">
                    <p className="mb-2 text-sm text-muted-foreground">Xem trước QR:</p>
                    <img
                      src={`https://img.vietqr.io/image/${settings.bank_id}-${settings.account_number}-compact.png?accountName=${encodeURIComponent(settings.account_name || "")}`}
                      alt="QR Preview"
                      className="w-48 h-auto rounded-lg border shadow-sm"
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Button
            type="submit"
            className="h-12 w-full rounded-2xl bg-foreground text-background shadow-lg transition-[background-color,box-shadow,transform] hover:scale-[1.01] hover:bg-foreground/90 active:scale-[0.98]"
            disabled={saving}
          >
            <Save className="w-5 h-5 mr-2" />
            {saving ? "Đang lưu..." : "Lưu thay đổi"}
          </Button>
        </form>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Plus className="w-4 h-4 text-green-500" />
            Chi phí khác
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <form
            onSubmit={handleAddCustomFee}
            className="space-y-4 rounded-2xl border bg-muted/35 p-4"
          >
            <h4 className="text-sm font-medium text-foreground">
              Thêm chi phí mới
            </h4>
            <div className="grid gap-4">
              <Input
                placeholder="Tên chi phí (VD: Internet)"
                value={newFee.name}
                onChange={(e) => setNewFee({ ...newFee, name: e.target.value })}
                required
              />

              <div className="grid grid-cols-2 gap-4">
                <Select
                  value={newFee.type}
                  onValueChange={(val: "fixed" | "unit") =>
                    setNewFee({ ...newFee, type: val })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Loại" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixed">Cố định</SelectItem>
                    <SelectItem value="unit">Theo đơn vị</SelectItem>
                  </SelectContent>
                </Select>

                {newFee.type === "fixed" ? (
                  <Input
                    placeholder="Số tiền"
                    type="number"
                    formatCurrency
                    value={newFee.fixed_amount}
                    onChange={(e) =>
                      setNewFee({ ...newFee, fixed_amount: e.target.value })
                    }
                    required
                  />
                ) : (
                  <Input
                    placeholder="Đơn giá"
                    type="number"
                    formatCurrency
                    value={newFee.unit_price}
                    onChange={(e) =>
                      setNewFee({ ...newFee, unit_price: e.target.value })
                    }
                    required
                  />
                )}
              </div>

              {newFee.type === "unit" && (
                <Input
                  placeholder="Tên đơn vị (VD: người, xe)"
                  value={newFee.unit_name}
                  onChange={(e) =>
                    setNewFee({ ...newFee, unit_name: e.target.value })
                  }
                  required
                />
              )}
            </div>

            <Button type="submit" variant="secondary" className="w-full">
              Thêm chi phí
            </Button>
          </form>

          {customFees.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-foreground">
                Danh sách chi phí
              </h4>
              <div className="space-y-2">
                {customFees.map((fee) => (
                  <div
                    key={fee.id}
                    className="flex items-center justify-between rounded-2xl border bg-background/80 p-3 transition-colors hover:border-primary/50"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`font-medium ${fee.is_active ? "text-foreground" : "text-muted-foreground"}`}
                        >
                          {fee.name}
                        </span>
                        <Badge
                          variant="outline"
                          className="text-[10px] h-5 px-1.5 font-normal bg-gray-50"
                        >
                          {fee.type === "fixed" ? "Cố định" : "Đơn vị"}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {fee.type === "fixed"
                          ? `${formatCurrency(fee.fixed_amount || 0)}/tháng`
                          : `${formatCurrency(fee.unit_price || 0)}/${fee.unit_name || "lần"}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Switch
                        checked={fee.is_active}
                        onCheckedChange={(checked) =>
                          handleToggleFee(fee.id, !checked)
                        }
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-red-500 hover:bg-red-50"
                        onClick={() => handleDeleteFee(fee.id, fee.name)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {message && (
        <div
          className={`fixed bottom-20 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full w-max shadow-lg text-sm font-medium animate-in fade-in slide-in-from-bottom-4 ${
            message.type === "success"
              ? "bg-green-600 text-white"
              : "bg-red-600 text-white"
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="p-4 bg-yellow-50 rounded-xl border border-yellow-100">
        <div className="flex items-start gap-3">
          <Lightbulb className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h3 className="font-semibold text-yellow-800 text-sm">
              Lưu ý nhỏ:
            </h3>
            <ul className="text-xs text-yellow-700 space-y-1 list-disc pl-3">
              <li>Cấu hình 1 lần, dùng mãi mãi!</li>
              <li>Giá này sẽ tự động áp dụng cho hóa đơn.</li>
              <li>Chi phí &quot;Đang bật&quot; (Switch ON) sẽ được tính.</li>
            </ul>
          </div>
        </div>
      </div>

      <AlertDialog
        open={deleteConfirm.isOpen}
        onOpenChange={(open) =>
          !open && setDeleteConfirm({ ...deleteConfirm, isOpen: false })
        }
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa chi phí?</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc muốn xóa chi phí &quot;{deleteConfirm.feeName}&quot;?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Xóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
