"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Calculator, History, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Tính tiền", icon: Calculator },
  { href: "/history", label: "Lịch sử", icon: History },
  { href: "/config", label: "Cấu hình", icon: SlidersHorizontal },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 safe-area-inset-bottom z-50 shadow-[0_-5px_20px_-10px_rgba(0,0,0,0.05)]">
      <div className="flex justify-around items-center h-18 pb-2 max-w-lg mx-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className="group flex flex-col items-center justify-center w-20 cursor-pointer"
            >
              <div
                className={cn(
                  "flex items-center justify-center mb-1.5 transition-all duration-300",
                  isActive
                    ? "bg-[#eef3ff] text-[#4f46e5] rounded-[14px]"
                    : "text-gray-400 group-hover:text-gray-600 bg-transparent",
                )}
              >
                <Icon
                  className={cn("w-6 h-6 transition-transform duration-300")}
                  strokeWidth={isActive ? 2.5 : 2}
                />
              </div>
              <span
                className={cn(
                  "text-[11px] font-medium leading-none transition-colors duration-300",
                  isActive
                    ? "text-[#4f46e5] font-bold"
                    : "text-gray-400 group-hover:text-gray-600",
                )}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
