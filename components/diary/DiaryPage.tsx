"use client";

import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabase/client";
import { Database } from "@/lib/supabase/types";
import { Button } from "@/components/ui/button";
import { 
  Plus, Trash2, ShieldCheck, ShieldAlert, 
  Lock, Unlock, Calendar as CalendarIcon, 
  Smile, Frown, Meh, Laugh, Heart, Sparkles,
  BarChart3, ChevronLeft, ChevronRight, Info, Loader2
} from "lucide-react";
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
import { encryptText, decryptText } from "@/lib/crypto/cipher";
import { format, startOfWeek, endOfWeek, isSameDay, subDays } from "date-fns";
import { vi } from "date-fns/locale";

type DiaryEntry = {
  id: string;
  created_at: string;
  date: string;
  content: string; // Encrypted
  mood: string;
  mood_level: number;
  is_encrypted: boolean;
  decryptedContent?: string;
};

const MOODS = [
  { level: 1, icon: Frown, label: "Tệ", color: "text-red-500", bg: "bg-red-50" },
  { level: 2, icon: Meh, label: "Hơi buồn", color: "text-orange-500", bg: "bg-orange-50" },
  { level: 3, icon: Smile, label: "Bình thường", color: "text-amber-500", bg: "bg-amber-50" },
  { level: 4, icon: Laugh, label: "Vui", color: "text-green-500", bg: "bg-green-50" },
  { level: 5, icon: Heart, label: "Tuyệt vời", color: "text-pink-500", bg: "bg-pink-50" },
];

export function DiaryPage() {
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [masterPassword, setMasterPassword] = useState("");
  const [isLocked, setIsLocked] = useState(true);
  
  // Entry Form State
  const [editingEntry, setEditingEntry] = useState<DiaryEntry | null>(null);
  const [content, setContent] = useState("");
  const [moodLevel, setMoodLevel] = useState(3);
  const [entryDate, setEntryDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  // AI Feedback State
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiFeedback, setAiFeedback] = useState<string | null>(null);

  const fetchEntries = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("diary")
      .select("*")
      .order("date", { ascending: false });
    
    if (error) {
      toast.error("Không thể tải nhật ký");
    } else {
      setEntries(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchEntries();
  }, []);

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!masterPassword) return;
    
    setLoading(true);
    try {
      if (entries.length > 0) {
        const testEntry = entries[0];
        await decryptText(testEntry.content, masterPassword);
      }
      setIsLocked(false);
      toast.success("Đã mở khóa Tâm Ký");
    } catch (err) {
      toast.error("Mật mã không đúng!");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content) return;

    try {
      const encrypted = await encryptText(content, masterPassword);
      const systemKey = process.env.NEXT_PUBLIC_SYSTEM_DIARY_KEY || "fallback-key";
      const aiEncrypted = await encryptText(content, systemKey);

      const payload = {
        date: entryDate,
        content: encrypted,
        ai_content: aiEncrypted,
        mood_level: moodLevel,
        mood: MOODS.find(m => m.level === moodLevel)?.label || "Bình thường",
        is_encrypted: true,
      };

      if (editingEntry) {
        const { error } = await supabase.from("diary").update(payload).eq("id", editingEntry.id);
        if (error) throw error;
        toast.success("Đã lưu chỉnh sửa");
      } else {
        const { error } = await supabase.from("diary").insert([payload]);
        if (error) throw error;
        toast.success("Đã thêm trang mới");
      }

      setIsOpen(false);
      fetchEntries();
    } catch (err) {
      toast.error("Lỗi khi lưu dữ liệu");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Xóa trang nhật ký này?")) return;
    const { error } = await supabase.from("diary").delete().eq("id", id);
    if (error) toast.error("Xóa thất bại");
    else fetchEntries();
  };

  const getAiInsight = async () => {
    if (!content) return;
    setIsAiLoading(true);
    setAiFeedback(null);
    try {
      const moodInfo = MOODS.find(m => m.level === moodLevel);
      await new Promise(resolve => setTimeout(resolve, 1500));

      let response = "";
      if (moodLevel <= 2) {
        response = `Chào sếp, Baymax đây. Em thấy sếp đang cảm thấy ${moodInfo?.label?.toLowerCase()}. Đừng quá khắt khe với bản thân nhé, ai cũng có những ngày như vậy. Hãy nghỉ ngơi một chút, uống một ly nước và nhớ rằng em luôn ở đây hỗ trợ sếp! 🔋`;
      } else if (moodLevel >= 4) {
        response = `Thật tuyệt vời khi thấy sếp đang ${moodInfo?.label?.toLowerCase()}! Hãy giữ vững năng lượng tích cực này nhé. Sếp đã làm rất tốt rồi, em rất tự hào về sếp! ✨`;
      } else {
        response = `Một ngày ${moodInfo?.label?.toLowerCase()} cũng là một ngày đáng quý để cân bằng lại. Chúc sếp có một buổi tối thật bình yên để chuẩn bị cho những bứt phá ngày mai! 🫡`;
      }
      
      setAiFeedback(response);
    } catch (err) {
      toast.error("Baymax đang bận một chút, sếp thử lại sau nhé!");
    } finally {
      setIsAiLoading(false);
    }
  };

  const openAdd = () => {
    setEditingEntry(null);
    setContent("");
    setMoodLevel(3);
    setEntryDate(format(new Date(), 'yyyy-MM-dd'));
    setAiFeedback(null);
    setIsOpen(true);
  };

  const openEdit = async (entry: DiaryEntry) => {
    try {
      const decrypted = await decryptText(entry.content, masterPassword);
      setEditingEntry(entry);
      setContent(decrypted);
      setMoodLevel(entry.mood_level);
      setEntryDate(entry.date);
      setAiFeedback(null);
      setIsOpen(true);
    } catch (err) {
      toast.error("Không thể giải mã trang này");
    }
  };

  const moodStats = useMemo(() => {
    const stats = [0, 0, 0, 0, 0];
    entries.slice(0, 7).forEach(e => stats[e.mood_level - 1]++);
    return stats;
  }, [entries]);

  if (isLocked) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center animate-in fade-in duration-700">
        <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mb-6 border-4 border-white shadow-xl">
          <Lock className="h-10 w-10 text-amber-600" />
        </div>
        <h2 className="text-3xl font-black text-slate-800 mb-2 uppercase tracking-tighter">Tâm Ký</h2>
        <p className="text-slate-400 text-sm mb-8 font-medium max-w-[250px]">
          Mọi tâm tư của sếp đều được mã hóa. <br/>Vui lòng nhập mật mã để xem.
        </p>

        <form onSubmit={handleUnlock} className="w-full space-y-4 max-w-sm">
          <Input
            type="password"
            placeholder="Mật mã bí mật của sếp..."
            value={masterPassword}
            onChange={(e) => setMasterPassword(e.target.value)}
            className="h-16 text-center text-2xl rounded-2xl border-slate-200 shadow-inner bg-slate-50 focus:bg-white"
          />
          <Button type="submit" className="w-full h-16 rounded-2xl text-xl font-black bg-[#f59e0b] shadow-xl shadow-amber-100">
            MỞ KHÓA
          </Button>
          <p className="text-[10px] text-slate-300 font-bold uppercase tracking-widest flex items-center justify-center gap-2">
            <ShieldCheck className="h-3 w-3" /> Zero-Knowledge Encryption
          </p>
        </form>
      </div>
    );
  }

  return (
    <div className="relative pb-24 animate-in fade-in duration-500">
      <div className="flex items-center justify-between mb-8 px-1">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tighter uppercase italic">Tâm Ký</h2>
          <p className="text-xs text-slate-400 font-bold flex items-center gap-1 uppercase tracking-wider">
            <ShieldCheck className="h-3 w-3 text-green-500" /> Đã bảo vệ dữ liệu
          </p>
        </div>
        <Button 
          variant="outline" 
          size="icon" 
          onClick={() => { setIsLocked(true); setMasterPassword(""); }}
          className="rounded-xl border-slate-200 h-12 w-12 shadow-sm text-slate-400"
        >
          <Unlock className="h-5 w-5" />
        </Button>
      </div>

      <div className="bg-white border border-slate-100 p-5 rounded-[2rem] shadow-sm mb-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-black text-slate-800 text-sm uppercase tracking-wider flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-amber-500" /> Tần số cảm xúc (7 ngày)
          </h3>
          <Sparkles className="h-4 w-4 text-amber-300" />
        </div>
        <div className="flex items-end justify-between h-20 gap-3 px-2">
          {MOODS.map((m, idx) => {
            const height = entries.length > 0 ? (moodStats[idx] / 7) * 100 : 0;
            return (
              <div key={idx} className="flex-1 flex flex-col items-center gap-2">
                <div 
                    className={cn("w-full rounded-t-xl transition-all duration-1000", m.bg)} 
                    style={{ height: `${Math.max(height, 10)}%` }}
                />
                <m.icon className={cn("h-5 w-5", m.color)} />
              </div>
            )
          })}
        </div>
      </div>

      <div className="space-y-6">
        {entries.length === 0 ? (
          <div className="text-center py-16 bg-slate-50/50 border-2 border-dashed rounded-[3rem] border-slate-200">
            <CalendarIcon className="h-12 w-12 mx-auto text-slate-200 mb-4" />
            <p className="text-slate-400 font-bold uppercase text-xs tracking-widest">Sếp chưa viết gì hôm nay</p>
          </div>
        ) : (
          entries.map((entry) => (
            <div key={entry.id} className="group relative">
                <div className="flex items-center gap-3 mb-2 px-2">
                    <div className="h-[1px] flex-1 bg-slate-100" />
                    <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest italic">
                        {format(new Date(entry.date), 'dd MMMM yyyy', { locale: vi })}
                    </span>
                    <div className="h-[1px] flex-1 bg-slate-100" />
                </div>

                <div 
                    onClick={() => openEdit(entry)}
                    className="bg-white border border-slate-100 p-6 rounded-[2.5rem] shadow-sm active:scale-95 transition-all cursor-pointer relative overflow-hidden"
                >
                    <div className="flex items-start justify-between gap-4 mb-3">
                        <div className="h-12 w-12 rounded-2xl bg-slate-50 flex items-center justify-center border border-slate-100">
                             {(() => {
                                 const M = MOODS.find(m => m.level === entry.mood_level) || MOODS[2];
                                 return <M.icon className={cn("h-7 w-7", M.color)} />
                             })()}
                        </div>
                        <div className="flex gap-1">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-10 w-10 text-slate-200 hover:text-red-400"
                                onClick={(e) => { e.stopPropagation(); handleDelete(entry.id); }}
                            >
                                <Trash2 className="h-5 w-5" />
                            </Button>
                        </div>
                    </div>
                    <p className="text-slate-400 text-sm leading-relaxed line-clamp-3 italic">
                        Nội dung đã được mã hóa. Chạm để xem chi tiết hoặc chỉnh sửa.
                    </p>
                    <div className="absolute top-0 right-0 p-1">
                         <ShieldCheck className="h-3 w-3 text-slate-100" />
                    </div>
                </div>
            </div>
          ))
        )}
      </div>

      <Button 
        onClick={openAdd} 
        size="icon" 
        className="fixed bottom-24 right-6 h-16 w-16 rounded-full shadow-2xl bg-slate-800 hover:bg-black text-white z-50 border-4 border-white active:scale-90 transition-transform"
      >
        <Plus className="h-8 w-8" />
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[500px] w-[95vw] rounded-[3rem] p-8 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-slate-800 italic uppercase">
              {editingEntry ? "Sửa trang cũ" : "Trang mới"}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-8 pt-6">
            <div className="space-y-4">
              <Label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Tâm trạng sếp lúc này?</Label>
              <div className="flex justify-between gap-2">
                {MOODS.map((m) => (
                  <button
                    key={m.level}
                    type="button"
                    onClick={() => setMoodLevel(m.level)}
                    className={cn(
                      "flex-1 flex flex-col items-center py-4 rounded-3xl border-2 transition-all active:scale-90",
                      moodLevel === m.level 
                        ? cn(m.bg, m.color, "border-current shadow-lg shadow-current/10") 
                        : "border-slate-50 text-slate-300"
                    )}
                  >
                    <m.icon className="h-8 w-8 mb-1" />
                    <span className="text-[10px] font-black uppercase tracking-tighter leading-none">{m.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Thời gian</Label>
              <Input
                type="date"
                value={entryDate}
                onChange={(e) => setEntryDate(e.target.value)}
                className="h-14 text-lg rounded-2xl border-slate-100 bg-slate-50 font-bold"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1 flex justify-between">
                <span>Tâm tư của sếp</span>
                <button onClick={getAiInsight} disabled={isAiLoading || !content} className="flex items-center gap-1 text-amber-500 hover:text-amber-600 disabled:opacity-30">
                    {isAiLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                    <span>Baymax ơi</span>
                </button>
              </Label>
              
              {aiFeedback && (
                <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl text-sm text-amber-800 animate-in zoom-in-95 duration-300">
                    <div className="flex gap-2">
                        <Sparkles className="h-4 w-4 shrink-0 mt-0.5" />
                        <p className="font-medium leading-relaxed">{aiFeedback}</p>
                    </div>
                </div>
              )}

              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Hôm nay sếp cảm thấy thế nào? Hãy viết ra đây để em bảo mật giúp sếp..."
                className="min-h-[250px] text-lg rounded-[2rem] border-slate-100 bg-slate-50 p-6 focus:bg-white transition-colors"
              />
            </div>

            <div className="flex gap-3">
                 <Button type="button" className="flex-1 h-16 text-xl font-black rounded-3xl bg-slate-800 text-white shadow-xl active:scale-95 transition-all" onClick={handleSave}>
                    {editingEntry ? "CẬP NHẬT" : "LƯU TRANG"}
                </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
