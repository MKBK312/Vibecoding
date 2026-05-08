import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MindLink AI",
  description: "个人知识内化系统",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="h-screen overflow-hidden bg-white text-slate-700 antialiased">
        {children}
      </body>
    </html>
  );
}
