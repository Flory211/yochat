import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ЁЧат",
  description: "Чат для общения",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
