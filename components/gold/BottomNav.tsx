"use client";

import { Home, History, Plus, User, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface BottomNavProps {
  currentTab: "home" | "history" | "profile";
  onTabChange: (tab: "home" | "history" | "profile") => void;
}

export function BottomNav({ currentTab, onTabChange }: BottomNavProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-t border-border pb-safe">
      <div className="flex justify-around items-center h-16 px-2">
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
          <Home className="h-6 w-6" />
          <span className="text-[10px] font-medium">Trang chủ</span>
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
          <History className="h-6 w-6" />
          <span className="text-[10px] font-medium">Lịch sử</span>
        </button>
      </div>
    </div>
  );
}
