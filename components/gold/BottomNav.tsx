"use client";

import {
  Home,
  FileText,
  PiggyBank,
  Tablet,
} from "lucide-react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Vàng", icon: Home },
  { href: "/ipad", label: "iPad", icon: Tablet },
  { href: "/budget", label: "Tính nợ", icon: FileText },
  { href: "/savings", label: "Tích góp", icon: PiggyBank },
  { href: "/room-rental", label: "Tiền Trọ", icon: Home },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Điều hướng chính" className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/60 bg-background/88 pb-[calc(env(safe-area-inset-bottom)+6px)] shadow-[0_-18px_42px_-30px_rgba(0,0,0,0.5)] backdrop-blur-2xl supports-[backdrop-filter]:bg-background/72">
      <div className="mx-auto flex h-[68px] max-w-md items-center justify-around gap-1 px-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "group flex min-h-14 w-full flex-col items-center justify-center gap-1 rounded-2xl transition-[background-color,color,transform,opacity] duration-150 ease-out active:scale-[0.96] motion-reduce:transition-none motion-reduce:active:scale-100",
                isActive
                  ? "bg-primary/18 text-primary shadow-[inset_0_0_0_1px_rgba(0,0,0,0.04)]"
                  : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
              )}
            >
              <Icon className="h-5 w-5 transition-transform duration-150 ease-out group-hover:-translate-y-0.5 motion-reduce:transition-none" />
              <span className="text-[10px] font-semibold leading-3 tracking-tight">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
