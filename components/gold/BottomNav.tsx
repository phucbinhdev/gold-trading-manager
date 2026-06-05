"use client";

import {
  Home,
  FileText,
  CalendarClock,
  PiggyBank,
  Tablet,
} from "lucide-react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Vàng", icon: Home },
  { href: "/ipad", label: "iPad", icon: Tablet },
  { href: "/history", label: "Lịch Sử", icon: CalendarClock },
  { href: "/budget", label: "Tính Rợ", icon: FileText },
  { href: "/savings", label: "Tích góp", icon: PiggyBank },
  { href: "/room-rental", label: "Tiền Trọ", icon: Home },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/70 bg-background/85 pb-[calc(env(safe-area-inset-bottom)+4px)] shadow-[0_-16px_40px_-30px_rgba(0,0,0,0.45)] backdrop-blur-xl">
      <div className="flex h-16 max-w-md items-center justify-around px-1.5 mx-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex min-h-12 w-full flex-col items-center justify-center gap-1 rounded-2xl transition-[background-color,color,transform] duration-150 ease-out active:scale-[0.96] motion-reduce:transition-none motion-reduce:active:scale-100",
                isActive
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
              )}
            >
              <Icon className="h-5 w-5 transition-transform duration-150 ease-out group-hover:-translate-y-0.5 motion-reduce:transition-none" />
              <span className="text-[9px] font-semibold leading-none tracking-tight">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
