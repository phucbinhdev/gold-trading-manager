"use client";

import {
  Home,
  History,
  Plus,
  User,
  FileText,
  ShoppingBag,
  BookHeart,
  CalendarClock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface BottomNavProps {
  currentTab: "home" | "history" | "profile" | "budget" | "wishlist" | "diary" | "room-rental";
  onTabChange: (
    tab: "home" | "history" | "profile" | "budget" | "wishlist" | "diary" | "room-rental",
  ) => void;
}

export function BottomNav({ currentTab, onTabChange }: BottomNavProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-t border-border pb-[calc(env(safe-area-inset-bottom)+4px)]">
      <div className="flex justify-around items-center h-16 px-1">
        {/* Home */}
        <button
          onClick={() => onTabChange("home")}
          className={cn(
            "flex flex-col items-center justify-center w-full space-y-1 transition-colors",
            currentTab === "home"
              ? "text-primary"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Home className="h-5 w-5" />
          <span className="text-[9px] font-medium">Vàng</span>
        </button>

        {/* History */}
        <button
          onClick={() => onTabChange("history")}
          className={cn(
            "flex flex-col items-center justify-center w-full space-y-1 transition-colors",
            currentTab === "history"
              ? "text-primary"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <CalendarClock className="h-5 w-5" />
          <span className="text-[9px] font-medium">Lịch Sử</span>
        </button>

        {/* Budget */}
        <button
          onClick={() => onTabChange("budget")}
          className={cn(
            "flex flex-col items-center justify-center w-full space-y-1 transition-colors",
            currentTab === "budget"
              ? "text-primary"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <FileText className="h-5 w-5" />
          <span className="text-[9px] font-medium">Tính Rợ</span>
        </button>

        {/* Room Rental */}
        <button
          onClick={() => onTabChange("room-rental")}
          className={cn(
            "flex flex-col items-center justify-center w-full space-y-1 transition-colors",
            currentTab === "room-rental"
              ? "text-primary"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Home className="h-5 w-5" />
          <span className="text-[9px] font-medium">Tiền Trọ</span>
        </button>
      </div>
    </div>
  );
}
