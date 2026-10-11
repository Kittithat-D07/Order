import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ร้านอาหาร QR Order",
  description: "ระบบสั่งอาหารผ่าน QR Code",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th">
      <body className="min-h-screen bg-stone-50 text-stone-900 antialiased">
        {children}
      </body>
    </html>
  );
}
