import { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  iconColor?: string;
  actions?: ReactNode;
  showSettings?: boolean;
  showBack?: boolean;
  backHref?: string;
  className?: string;
}

export function PageHeader(props: PageHeaderProps) {
  const { title, className } = props;

  return (
    <header
      className={cn(
        "bg-transparent pb-2 pt-[calc(env(safe-area-inset-top)+6px)]",
        className,
      )}
    >
      <h1 className="truncate py-1 text-[32px] font-black leading-[1.18] tracking-normal text-foreground md:text-[36px]">
        {title}
      </h1>
    </header>
  );
}
