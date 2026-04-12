"use client";

import BillResult from "@/components/BillResult";
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
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/PageHeader";
import { deleteRecord, getRecords, getSettings } from "@/lib/supabase";
import type { Record as RecordType, Settings } from "@/types";
import { generateQuickLink } from "@/lib/vietqr";
import {
  Calendar,
  ChevronRight,
  History,
  QrCode,
  Receipt,
  Trash2,
  X,
  Wallet,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

// Simple Loading Component
function Loading() {
  return (
    <div className="flex justify-center items-center h-[50vh]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  );
}

export default function HistoryPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<RecordType[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<RecordType | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    recordId: string | null;
    recordMonth: string;
  }>({ isOpen: false, recordId: null, recordMonth: "" });
  const [qrModal, setQrModal] = useState<{
    isOpen: boolean;
    record: RecordType | null;
  }>({ isOpen: false, record: null });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [recordsData, settingsData] = await Promise.all([
        getRecords(),
        getSettings(),
      ]);
      setRecords(recordsData);
      setSettings(settingsData);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string, month: string) {
    setDeleteConfirm({ isOpen: true, recordId: id, recordMonth: month });
  }

  async function confirmDelete() {
    if (!deleteConfirm.recordId) return;

    const success = await deleteRecord(deleteConfirm.recordId);
    if (success) {
      setRecords(records.filter((r) => r.id !== deleteConfirm.recordId));
      setSelectedRecord(null);
    } else {
      alert("Có lỗi xảy ra, vui lòng thử lại.");
    }
    setDeleteConfirm({ isOpen: false, recordId: null, recordMonth: "" });
  }

  const formatMonth = (dateStr: string) => {
    const date = new Date(dateStr);
    return `Tháng ${date.getMonth() + 1}, ${date.getFullYear()}`;
  };

  const getQrLink = (record: RecordType) => {
    if (!settings?.bank_id || !settings?.account_number) return null;

    return generateQuickLink({
      bankId: settings.bank_id,
      accountNo: settings.account_number,
      amount: record.total_amount,
    });
  };

  if (loading) {
    return <Loading />;
  }

  if (records.length === 0) {
    return (
      <div className="px-4 py-6 space-y-6 max-w-md mx-auto">
        <PageHeader 
          title="Lịch sử" 
          subtitle="Danh sách hóa đơn"
          icon={<History className="w-6 h-6 text-white" />}
          iconColor="bg-gradient-to-br from-purple-500 to-indigo-600 shadow-purple-200"
        />

        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-10 text-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
              <Receipt className="w-8 h-8 text-gray-400" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">Chưa có hóa đơn nào</p>
              <p className="text-sm text-gray-500">
                Hãy tạo hóa đơn đầu tiên của bạn
              </p>
            </div>
            <Button onClick={() => router.push("/")}>Tạo hóa đơn mới</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 space-y-6 max-w-md mx-auto">
      <PageHeader 
        title="Lịch sử" 
        subtitle="Quản lý chi tiêu"
        icon={<History className="w-6 h-6 text-white" />}
        iconColor="bg-gradient-to-br from-purple-500 to-indigo-600 shadow-purple-200"
      />

      {/* Latest Record Highlight or List */}
      <div className="space-y-4">
        {records.map((record, index) => {
          const isSelected = selectedRecord?.id === record.id;

          return (
            <div
              key={record.id}
              className="relative transition-all duration-300"
            >
              <Card
                className={`cursor-pointer transition-all border shadow-sm ${
                  isSelected
                    ? "ring ring-primary border-primary"
                    : "border-gray-100 hover:shadow-md"
                }`}
              >
                <div
                  className="flex items-center justify-between gap-4"
                  onClick={() => setSelectedRecord(isSelected ? null : record)}
                >
                  <div className="flex items-center gap-4 min-w-0 space-y-1">
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                        isSelected
                          ? "bg-primary/10 text-primary"
                          : "bg-[#e2fbf1] text-[#00b979]" // Mint background & text
                      }`}
                    >
                      <Calendar className="w-6 h-6" />
                    </div>

                    <div className="min-w-0 space-y-2">
                      <h3 className="font-bold text-gray-900 text-[16px] md:text-[17px] leading-tight mb-2 truncated">
                        {formatMonth(record.month)}
                      </h3>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs md:text-[13px] text-gray-500 font-medium whitespace-nowrap">
                          {new Date(record.created_at).toLocaleDateString(
                            "vi-VN",
                          )}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className="font-bold text-gray-900 text-[16px] md:text-[17px]">
                      {new Intl.NumberFormat("vi-VN").format(
                        record.total_amount,
                      )}
                      đ
                    </span>
                    <ChevronRight
                      className={`w-5 h-5 text-gray-300 transition-transform duration-300 ${
                        isSelected ? "rotate-90" : ""
                      }`}
                    />
                  </div>
                </div>

                {isSelected && (
                  <div className="bg-gray-50/50 space-y-4 animate-accordion-down">
                    <BillResult
                      borderLess
                      month={record.month}
                      electricOld={record.electric_old}
                      electricNew={record.electric_new}
                      waterOld={record.water_old}
                      waterNew={record.water_new}
                      rentAmount={record.rent_amount}
                      electricAmount={record.electric_amount}
                      waterAmount={record.water_amount}
                      customFees={
                        record.record_custom_fees?.map((fee) => ({
                          name: fee.fee_name,
                          amount: fee.amount,
                          quantity: fee.quantity,
                        })) || []
                      }
                      totalAmount={record.total_amount}
                    />

                    <div className="flex gap-3 pt-2">
                      <Button
                        variant="outline"
                        className="flex-1 bg-blue-50 text-blue-600 hover:bg-blue-100 border-blue-200 h-10 font-medium"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (settings?.bank_id && settings?.account_number) {
                            setQrModal({ isOpen: true, record });
                          } else {
                            alert("Vui lòng cấu hình ngân hàng trước!");
                            router.push("/config");
                          }
                        }}
                      >
                        <QrCode className="w-4 h-4 mr-2" />
                        QR Chuyển khoản
                      </Button>

                      <Button
                        variant="destructive"
                        size="icon"
                        className="w-10 bg-red-50 text-red-600 hover:bg-red-100 shadow-none border border-red-200 h-10 shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(record.id, formatMonth(record.month));
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            </div>
          );
        })}
      </div>

      {/* Delete Confirmation Modal */}
      <AlertDialog
        open={deleteConfirm.isOpen}
        onOpenChange={(open) =>
          !open && setDeleteConfirm({ ...deleteConfirm, isOpen: false })
        }
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa bản ghi?</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc muốn xóa bản ghi "{deleteConfirm.recordMonth}"? Hành
              động này không thể hoàn tác.
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

      {/* QR Payment Modal */}
      <AlertDialog
        open={qrModal.isOpen}
        onOpenChange={(open) =>
          !open && setQrModal({ isOpen: false, record: null })
        }
      >
        <AlertDialogContent className="max-w-xs p-0 overflow-hidden bg-white border-0 rounded-3xl">
          <div className="bg-blue-600 p-4 text-center">
            <h3 className="text-white font-bold text-lg">Quét mã thanh toán</h3>
            <p className="text-blue-100 text-sm">
              {qrModal.record ? formatMonth(qrModal.record.month) : ""}
            </p>
          </div>
          {/* Trigger build */}
          <div className="p-6 flex flex-col items-center justify-center space-y-4 bg-white">
            {qrModal.record && getQrLink(qrModal.record) ? (
              <div className="relative group">
                <div className="absolute inset-0 bg-blue-500/20 blur-xl rounded-full"></div>
                <img
                  src={getQrLink(qrModal.record!)!}
                  alt="QR Code"
                  className="relative size-60 rounded-xl border-4 border-white shadow-xl"
                />
              </div>
            ) : (
              <div className="w-48 h-48 bg-gray-100 rounded-xl flex items-center justify-center text-gray-400">
                <QrCode className="w-8 h-8" />
              </div>
            )}

            <div className="text-center space-y-1">
              <p className="text-sm text-gray-500 font-medium">
                Số tiền cần thanh toán
              </p>
              <p className="text-2xl font-bold text-blue-600">
                {qrModal.record
                  ? new Intl.NumberFormat("vi-VN").format(
                      qrModal.record.total_amount,
                    )
                  : "0"}
                đ
              </p>
            </div>
          </div>

          <div className="p-4 bg-gray-50 border-t border-gray-100 flex gap-3">
            <Button
              variant="outline"
              className="flex-1 bg-pink-50 text-pink-600 hover:bg-pink-100 border-pink-200 rounded-xl"
              onClick={() => {
                window.location.href = "momo://app";
              }}
            >
              <Wallet className="w-4 h-4 mr-2" />
              Mở Momo
            </Button>
            <Button
              className="flex-1 bg-gray-900 text-white hover:bg-gray-800 rounded-xl"
              onClick={() => setQrModal({ isOpen: false, record: null })}
            >
              Đóng
            </Button>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
