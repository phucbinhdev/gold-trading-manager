import { ReactNode } from "react";

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
  void props;
  return null;
}
