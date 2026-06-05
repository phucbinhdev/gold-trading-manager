import type { Metadata, Viewport } from "next";
import "./globals.css";
import { BottomNav } from "@/components/gold/BottomNav";

export const metadata: Metadata = {
  title: "Quản Lý Vàng",
  description: "Theo dõi danh mục đầu tư vàng và lợi nhuận của bạn.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Quản Lý Vàng",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#FFFFFF",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body className="min-h-dvh antialiased selection:bg-primary/30">
        {children}
        <BottomNav />
      </body>
    </html>
  );
}
