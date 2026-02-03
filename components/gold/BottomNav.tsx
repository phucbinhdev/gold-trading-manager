"use client";

import { Home, History, Plus, User, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface BottomNavProps {
  currentTab: "home" | "history" | "profile";
  onTabChange: (tab: "home" | "history" | "profile") => void;
  onAddClick: () => void;
}

export function BottomNav({
  currentTab,
  onTabChange,
  onAddClick,
}: BottomNavProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-t border-border pb-safe">
      <div className="flex justify-around items-center h-16 px-2">
        {/* Home */}
        <button
          onClick={() => onTabChange("home")}
          className={cn(
            "flex flex-col items-center justify-center w-16 space-y-1 transition-colors",
            currentTab === "home"
              ? "text-primary"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Home className="h-6 w-6" />
          <span className="text-[10px] font-medium">Home</span>
        </button>

        {/* History */}
        <button
          onClick={() => onTabChange("history")}
          className={cn(
            "flex flex-col items-center justify-center w-16 space-y-1 transition-colors",
            currentTab === "history"
              ? "text-primary"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <History className="h-6 w-6" />
          <span className="text-[10px] font-medium">History</span>
        </button>

        {/* Add Button (FAB) */}
        <div className="relative -top-5">
          <Button
            onClick={onAddClick}
            size="icon"
            className="h-14 w-14 rounded-full shadow-lg bg-primary hover:bg-primary/90 text-primary-foreground border-4 border-background"
          >
            <Plus className="h-8 w-8" />
          </Button>
        </div>

        {/* Empty placeholder for symmetry if needed, or Profile */}
        <button
          onClick={() => onTabChange("profile")}
          className={cn(
            "flex flex-col items-center justify-center w-16 space-y-1 transition-colors",
            currentTab === "profile"
              ? "text-primary"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <User className="h-6 w-6" />
          <span className="text-[10px] font-medium">Profile</span>
        </button>
      </div>
    </div>
  );
}
