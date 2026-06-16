"use client";

import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { navItems } from "@/components/navigation/nav-items";
import { cn } from "@/lib/utils";

export function HomeMenuWidgets() {
  const pathname = usePathname();

  return (
    <section aria-label="Lối tắt chức năng" className="space-y-3">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="text-base font-bold leading-6 text-foreground">
            Menu nhanh
          </h2>
          <p className="text-sm leading-5 text-muted-foreground">
            Mỗi chức năng chính nằm trong một widget riêng.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5 md:gap-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              data-haptic="selection"
              className={cn(
                "group soft-surface min-h-36 rounded-[28px] border border-border/60 bg-card p-4 text-card-foreground transition-[border-color,background-color,box-shadow,transform] duration-150 ease-out active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100 md:min-h-40",
                "hover:-translate-y-0.5 hover:border-primary/45 hover:shadow-[0_18px_42px_-28px_rgba(0,0,0,0.45)]",
                isActive && "border-primary/55 bg-primary/8",
              )}
            >
              <div className="flex h-full flex-col justify-between gap-4">
                <div className="flex items-start justify-between gap-3">
                  <span
                    className={cn(
                      "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl",
                      item.accentClassName,
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                  <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground opacity-60 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </div>

                <div className="min-w-0">
                  <p className="text-[15px] font-bold leading-5 text-foreground">
                    {item.label}
                  </p>
                  <p className="mt-1 line-clamp-2 text-xs leading-4 text-muted-foreground">
                    {item.description}
                  </p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
