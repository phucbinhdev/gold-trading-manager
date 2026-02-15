"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import { Database } from "@/lib/supabase/types";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, ShoppingCart, ExternalLink, MoreVertical, Star, CheckCircle2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type WishlistItem = Database["public"]["Tables"]["wishlist"]["Row"];

export function WishlistPage() {
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<WishlistItem | null>(null);

  // Form State
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [note, setNote] = useState("");
  const [priority, setPriority] = useState<"Low" | "Medium" | "High">("Medium");
  const [url, setUrl] = useState("");

  const fetchWishlist = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("wishlist")
      .select("*")
      .order("priority", { ascending: false }) // High first
      .order("created_at", { ascending: false });
    
    if (error) {
      toast.error("Không thể tải danh sách");
    } else {
      // Custom sort: High -> Medium -> Low
      const priorityOrder = { High: 3, Medium: 2, Low: 1 };
      const sorted = (data || []).sort((a, b) => {
        if (a.is_purchased !== b.is_purchased) return a.is_purchased ? 1 : -1;
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      });
      setItems(sorted);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchWishlist();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name,
      price: price ? parseFloat(price) : null,
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
        fetchWishlist();
      }
    } else {
      const { error } = await supabase.from("wishlist").insert([payload]);
      if (error) toast.error("Thêm mới thất bại");
      else {
        toast.success("Đã thêm vào danh sách");
        setIsOpen(false);
        fetchWishlist();
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Xóa mục này?")) return;
    const { error } = await supabase.from("wishlist").delete().eq("id", id);
    if (error) toast.error("Xóa thất bại");
    else {
      toast.success("Đã xóa");
      fetchWishlist();
    }
  };

  const togglePurchased = async (item: WishlistItem) => {
    const { error } = await supabase
      .from("wishlist")
      .update({ is_purchased: !item.is_purchased })
      .eq("id", item.id);
    
    if (error) toast.error("Cập nhật thất bại");
    else fetchWishlist();
  };

  const openEdit = (item: WishlistItem) => {
    setEditingItem(item);
    setName(item.name);
    setPrice(item.price?.toString() || "");
    setNote(item.note || "");
    setPriority(item.priority);
    setUrl(item.product_url || "");
    setIsOpen(true);
  };

  const openAdd = () => {
    setEditingItem(null);
    setName("");
    setPrice("");
    setNote("");
    setPriority("Medium");
    setUrl("");
    setIsOpen(true);
  };

  const getPriorityColor = (p: string) => {
    switch (p) {
      case "High": return "text-red-500 bg-red-50 dark:bg-red-950/30";
      case "Medium": return "text-amber-500 bg-amber-50 dark:bg-amber-950/30";
      default: return "text-blue-500 bg-blue-50 dark:bg-blue-950/30";
    }
  };

  return (
    <div className="relative pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Wishlist</h2>
          <p className="text-sm text-muted-foreground">Những món đồ sếp đang "nhắm" tới.</p>
        </div>
      </div>

      <div className="grid gap-4">
        {loading ? (
          <p className="text-center py-8 text-muted-foreground">Đang tải...</p>
        ) : items.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed rounded-xl border-border/50">
            <ShoppingCart className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground">Chưa có món nào. Sếp thêm gì đi!</p>
          </div>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className={cn(
                "group relative p-5 rounded-2xl border border-border/50 bg-card/50 transition-all hover:shadow-md",
                item.is_purchased && "opacity-60 grayscale-[0.5]"
              )}
            >
              <div className="flex items-start justify-between">
                <div className="space-y-1 pr-12">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className={cn("font-bold text-xl leading-tight", item.is_purchased && "line-through")}>
                      {item.name}
                    </h3>
                    <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full uppercase", getPriorityColor(item.priority))}>
                      {item.priority === 'High' ? '🔥 Ưu tiên cao' : item.priority === 'Medium' ? '⚡ Trung bình' : '🧊 Thấp'}
                    </span>
                  </div>
                  
                  {item.price && (
                    <p className="text-primary font-bold text-lg">
                      {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(item.price)}
                    </p>
                  )}
                  
                  {item.note && <p className="text-base text-muted-foreground">{item.note}</p>}
                </div>

                <div className="flex flex-col gap-3">
                   <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 text-muted-foreground"
                    onClick={() => openEdit(item)}
                  >
                    <MoreVertical className="h-5 w-5" />
                  </Button>
                  <Button
                    variant={item.is_purchased ? "secondary" : "outline"}
                    size="icon"
                    className={cn("h-12 w-12 rounded-full border-2", item.is_purchased ? "text-green-500 border-green-500 bg-green-50" : "text-muted-foreground border-border")}
                    onClick={() => togglePurchased(item)}
                  >
                    <CheckCircle2 className={cn("h-6 w-6", item.is_purchased && "fill-current")} />
                  </Button>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <div className="flex gap-2">
                  {item.product_url && (
                    <a
                      href={item.product_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium flex items-center gap-1 text-primary bg-primary/10 px-3 py-1.5 rounded-lg hover:bg-primary/20"
                    >
                      <ExternalLink className="h-4 w-4" /> Xem shop
                    </a>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 text-destructive opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => handleDelete(item.id)}
                >
                  <Trash2 className="h-5 w-5" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Fixed Float Action Button */}
      <Button 
        onClick={openAdd} 
        size="icon" 
        className="fixed bottom-24 right-6 h-16 w-16 rounded-full shadow-2xl bg-primary hover:bg-primary/90 text-primary-foreground z-50 border-4 border-background"
      >
        <Plus className="h-8 w-8" />
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[425px] w-[95vw] rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">{editingItem ? "Sửa món đồ" : "Thêm vào Wishlist"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-6 pt-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-base font-semibold">Tên sản phẩm *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ví dụ: iPhone 16 Pro Max"
                className="h-14 text-lg rounded-xl"
                required
              />
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price" className="text-base font-semibold">Giá tiền (VND)</Label>
                <Input
                  id="price"
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="30000000"
                  className="h-14 text-lg rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="priority" className="text-base font-semibold">Độ ưu tiên</Label>
                <Select value={priority} onValueChange={(v: any) => setPriority(v)}>
                  <SelectTrigger id="priority" className="h-14 text-lg rounded-xl">
                    <SelectValue placeholder="Chọn mức" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="High" className="py-3">🔥 Cao</SelectItem>
                    <SelectItem value="Medium" className="py-3">⚡ Vừa</SelectItem>
                    <SelectItem value="Low" className="py-3">🧊 Thấp</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="url" className="text-base font-semibold">Link sản phẩm</Label>
              <Input
                id="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://shopee.vn/..."
                className="h-14 text-lg rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="note" className="text-base font-semibold">Ghi chú</Label>
              <Textarea
                id="note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Màu sắc, cửa hàng, cấu hình..."
                className="min-h-[100px] text-lg rounded-xl p-4"
              />
            </div>

            <Button type="submit" className="w-full h-16 text-xl font-bold rounded-2xl shadow-lg mt-4">
              {editingItem ? "Lưu thay đổi" : "Thêm ngay"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
