import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ЁЧат - Чат для онлайн-школы Ёшкола",
  description: "Групповые чаты для онлайн-школы Ёшкола",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <AuthProvider>{children}</AuthProvider>
        <div className="fixed bottom-2 right-2 text-xs text-gray-500 bg-white/80 px-2 py-1 rounded shadow z-50">
          v1.1
        </div>
      </body>
    </html>
  );
}
