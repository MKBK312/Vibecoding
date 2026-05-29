import type { Metadata } from "next";
import "./globals.css";
import { Inter } from "next/font/google";
import { cn } from "@/lib/utils";
import { Providers } from "./providers";

const inter = Inter({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  title: "MindLink AI",
  description: "个人知识内化系统",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" className={cn("font-sans", inter.variable)}>
      <body className="h-screen overflow-hidden bg-white text-slate-700 antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
