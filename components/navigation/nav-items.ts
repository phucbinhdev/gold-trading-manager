import type { LucideIcon } from "lucide-react";
import { FileText, Home, PiggyBank, Tablet } from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
  accentClassName: string;
}

export const navItems: NavItem[] = [
  {
    href: "/",
    label: "Vàng",
    description: "Theo dõi giao dịch và giá trị danh mục",
    icon: Home,
    accentClassName: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  },
  {
    href: "/ipad",
    label: "iPad",
    description: "Quản lý máy, công nợ và tồn kho",
    icon: Tablet,
    accentClassName: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  },
  {
    href: "/budget",
    label: "Tính nợ",
    description: "Ghi khoản chi và cân đối nguồn tiền",
    icon: FileText,
    accentClassName: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  },
  {
    href: "/savings",
    label: "Tích góp",
    description: "Theo dõi tiến độ tiết kiệm theo ô",
    icon: PiggyBank,
    accentClassName: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
  },
  {
    href: "/room-rental",
    label: "Tiền Trọ",
    description: "Tính điện nước, phí và lịch sử hóa đơn",
    icon: Home,
    accentClassName: "bg-violet-500/15 text-violet-700 dark:text-violet-300",
  },
];
