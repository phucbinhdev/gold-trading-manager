"use client";

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { Database } from "@/lib/supabase/types";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, ShoppingCart, MoreVertical, CheckCircle2 } from "lucide-react";
import { NumericFormat } from "react-number-format";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { PullToRefresh } from "@/components/navigation/PullToRefresh";
import { useScreenState } from "@/lib/hooks/use-screen-state";
import { queryKeys } from "@/lib/query-keys";

type WishlistItem = Database["public"]["Tables"]["wishlist"]["Row"];
type WishlistPriority = "Low" | "Medium" | "High";
const priorityOptions: Array<{
  value: WishlistPriority;
  label: string;
  color: string;
  active: string;
}> = [
  {
    value: "High",
    label: "Cao 🔥",
    color: "border-red-200 text-red-500 bg-red-50",
    active: "bg-red-500 text-white border-red-600 shadow-md shadow-red-100",
  },
  {
    value: "Medium",
    label: "Vừa ⚡",
    color: "border-amber-200 text-amber-600 bg-amber-50",
    active: "bg-amber-500 text-white border-amber-600 shadow-md shadow-amber-100",
  },
  {
    value: "Low",
    label: "Thấp 🧊",
    color: "border-blue-200 text-blue-500 bg-blue-50",
    active: "bg-blue-500 text-white border-blue-600 shadow-md shadow-blue-100",
  },
];

export function WishlistPage() {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<WishlistItem | null>(null);

  // Form State
  const [name, setName] = useScreenState("wishlist:name", "");
  const [price, setPrice] = useScreenState<number | undefined>(
    "wishlist:price",
    undefined,
  );
  const [note, setNote] = useScreenState("wishlist:note", "");
  const [priority, setPriority] = useScreenState<WishlistPriority>(
    "wishlist:priority",
    "Medium",
  );
  const [url, setUrl] = useScreenState("wishlist:url", "");

  const wishlistQuery = useQuery({
    queryKey: queryKeys.wishlist.items(),
    queryFn: async () => {
    const { data, error } = await supabase
      .from("wishlist")
      .select("*")
      .order("created_at", { ascending: false });
    
      if (error) throw error;
      const priorityOrder: Record<string, number> = { High: 3, Medium: 2, Low: 1 };
      return (data || []).sort((a, b) => {
        if (a.is_purchased !== b.is_purchased) return a.is_purchased ? 1 : -1;
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      });
    },
  });

  const items = wishlistQuery.data || [];
  const loading = wishlistQuery.isLoading && items.length === 0;

  const refreshWishlist = async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.wishlist.items() });
  };

  useEffect(() => {
    if (wishlistQuery.error) {
      toast.error("Không thể tải danh sách");
    }
  }, [wishlistQuery.error]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name,
      price: price ?? null,
      note,
      priority,
      product_url: url,
    };

    if (editingItem) {
      const { error } = await supabase
        .from("wishlist")
        .update(payload)
        .eq("id", editingItem.id);
      
      if (error) toast.error("Cập nhật thất bại");
      else {
        toast.success("Đã cập nhật");
        setIsOpen(false);
        void refreshWishlist();
      }
    } else {
      const { error } = await supabase.from("wishlist").insert([payload]);
      if (error) toast.error("Thêm mới thất bại");
      else {
        toast.success("Đã thêm vào danh sách");
        setIsOpen(false);
        void refreshWishlist();
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Xóa mục này?")) return;
    const { error } = await supabase.from("wishlist").delete().eq("id", id);
    if (error) toast.error("Xóa thất bại");
    else {
      toast.success("Đã xóa");
      void refreshWishlist();
    }
  };

  const togglePurchased = async (item: WishlistItem) => {
    const { error } = await supabase
      .from("wishlist")
      .update({ is_purchased: !item.is_purchased })
      .eq("id", item.id);
    
    if (error) toast.error("Cập nhật thất bại");
    else void refreshWishlist();
  };

  const openEdit = (item: WishlistItem) => {
    setEditingItem(item);
    setName(item.name);
    setPrice(item.price ?? undefined);
    setNote(item.note || "");
    setPriority(item.priority);
    setUrl(item.product_url || "");
    setIsOpen(true);
  };

  const openAdd = () => {
    setEditingItem(null);
    setName("");
    setPrice(undefined);
    setNote("");
    setPriority("Medium");
    setUrl("");
    setIsOpen(true);
  };

  return (
    <PullToRefresh
      onRefresh={refreshWishlist}
      refreshing={wishlistQuery.isFetching}
      className="relative pb-24 animate-in fade-in duration-500"
    >
      <div className="flex flex-col gap-1 mb-6 px-1">
        <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Wishlist</h2>
        <p className="text-xs text-slate-400 font-medium">Danh sách mục tiêu sắm sửa</p>
      </div>

      <div className="flex flex-col gap-3">
        {loading ? (
          <p className="text-center py-8 text-slate-400 text-sm">Đang tải...</p>
        ) : items.length === 0 ? (
          <div className="text-center py-16 bg-slate-50/50 border-2 border-dashed rounded-3xl border-slate-200">
            <ShoppingCart className="h-12 w-12 mx-auto text-slate-200 mb-4" />
            <p className="text-slate-400 font-medium">Chưa có món nào. Sếp thêm gì đi!</p>
          </div>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className={cn(
                "group relative p-4 rounded-2xl border transition-all",
                item.is_purchased 
                  ? "bg-[#f0faf4] border-[#d7f1e1] opacity-90" 
                  : "bg-white border-[#fef3c7] shadow-sm"
              )}
            >
              <div className="flex items-center justify-between gap-3">
                {/* Left: Status Icon */}
                <button 
                  onClick={() => togglePurchased(item)}
                  className={cn(
                    "h-10 w-10 shrink-0 rounded-full flex items-center justify-center border-2 transition-all active:scale-90",
                    item.is_purchased 
                      ? "bg-[#22c55e] border-[#22c55e] text-white" 
                      : "border-[#f59e0b] bg-white"
                  )}
                >
                  {item.is_purchased && <CheckCircle2 className="h-6 w-6" />}
                </button>

                {/* Middle: Content */}
                <div className="flex-1 min-w-0">
                  <h3 className={cn(
                    "font-bold text-lg leading-tight truncate",
                    item.is_purchased ? "text-slate-600" : "text-slate-800"
                  )}>
                    {item.name}
                  </h3>
                  <p className={cn(
                    "text-base font-semibold",
                    item.is_purchased ? "text-[#22c55e]/70" : "text-slate-500"
                  )}>
                    {item.price ? new Intl.NumberFormat('vi-VN').format(item.price) + ' đ' : '---'}
                  </p>
                </div>

                {/* Right: Badge or Actions */}
                <div className="flex items-center gap-1">
                  {item.is_purchased ? (
                    <span className="bg-[#dcfce7] text-[#15803d] text-[10px] font-black px-3 py-1.5 rounded-lg tracking-wider border border-[#bbf7d0]">
                      ĐÃ MUA
                    </span>
                  ) : (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10 text-slate-300 hover:text-slate-500"
                        onClick={() => openEdit(item)}
                      >
                        <MoreVertical className="h-5 w-5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10 text-slate-200 hover:text-red-400"
                        onClick={() => handleDelete(item.id)}
                      >
                        <Trash2 className="h-5 w-5" />
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {/* URL & Note footer if not purchased */}
              {!item.is_purchased && (item.product_url || item.note) && (
                <div className="mt-3 pt-3 border-t border-amber-50 flex items-center justify-between gap-4">
                  <div className="flex-1">
                    {item.note && <p className="text-xs text-slate-400 italic line-clamp-1 italic">{item.note}</p>}
                  </div>
                  {item.product_url && (
                    <a
                      href={item.product_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 text-[10px] font-black text-[#b45309] bg-[#fef3c7] px-2.5 py-1 rounded-md tracking-tight active:scale-95 transition-transform"
                    >
                      XEM SHOP
                    </a>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Floating Action Button */}
      <Button 
        onClick={openAdd} 
        size="icon" 
        className="fixed bottom-24 right-6 h-16 w-16 rounded-full shadow-2xl bg-[#f59e0b] hover:bg-[#d97706] text-white z-50 border-4 border-white active:scale-90 transition-transform"
      >
        <Plus className="h-8 w-8" />
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[425px] w-[92vw] rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-slate-800">
              {editingItem ? "Sửa món đồ" : "Thêm vào Wishlist"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-6 pt-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-bold text-slate-600 uppercase tracking-wider">Tên sản phẩm *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ví dụ: iPhone 16 Pro Max"
                className="h-14 text-lg rounded-2xl border-slate-200 bg-slate-50 focus:bg-white"
                required
              />
            </div>
            
            <div className="space-y-3">
              <Label className="text-sm font-bold text-slate-600 uppercase tracking-wider">Độ ưu tiên</Label>
              <div className="flex gap-2">
                {priorityOptions.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setPriority(p.value)}
                    className={cn(
                      "flex-1 py-3 px-2 rounded-2xl border-2 font-bold text-sm transition-all active:scale-95",
                      priority === p.value ? p.active : cn("opacity-60", p.color)
                    )}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="price" className="text-sm font-bold text-slate-600 uppercase tracking-wider">Giá tiền (VND)</Label>
              <NumericFormat
                customInput={Input}
                id="price"
                thousandSeparator="."
                decimalSeparator=","
                decimalScale={0}
                allowNegative={false}
                placeholder="30.000.000"
                className="h-14 text-lg rounded-2xl border-slate-200 bg-slate-50 focus:bg-white w-full"
                value={price}
                onValueChange={(values) => {
                  setPrice(values.floatValue);
                }}
                inputMode="decimal"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="url" className="text-sm font-bold text-slate-600 uppercase tracking-wider">Link sản phẩm</Label>
              <Input
                id="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://shopee.vn/..."
                className="h-14 text-lg rounded-2xl border-slate-200 bg-slate-50 focus:bg-white"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="note" className="text-sm font-bold text-slate-600 uppercase tracking-wider">Ghi chú</Label>
              <Textarea
                id="note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Màu sắc, cửa hàng, cấu hình..."
                className="min-h-[100px] text-lg rounded-2xl border-slate-200 bg-slate-50 focus:bg-white p-4"
              />
            </div>

            <Button type="submit" className="w-full h-16 text-xl font-black rounded-2xl shadow-xl shadow-amber-100 bg-[#f59e0b] hover:bg-[#d97706] text-white active:scale-95 transition-all mt-4">
              {editingItem ? "LƯU THAY ĐỔI" : "THÊM NGAY"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </PullToRefresh>
  );
}
