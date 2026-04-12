"use client";

import {
  Home,
  FileText,
  CalendarClock,
} from "lucide-react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Vàng", icon: Home },
  { href: "/history", label: "Lịch Sử", icon: CalendarClock },
  { href: "/budget", label: "Tính Rợ", icon: FileText },
  { href: "/room-rental", label: "Tiền Trọ", icon: Home },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-t border-border pb-[calc(env(safe-area-inset-bottom)+4px)]">
      <div className="flex justify-around items-center h-16 px-1 max-w-md mx-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center w-full space-y-1 transition-colors",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[9px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}