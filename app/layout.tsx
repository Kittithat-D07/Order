import type { Metadata, Viewport } from "next";
import { Prompt, Playfair_Display, Cormorant_Garamond } from "next/font/google";
import "./globals.css";
import { ErrorBoundary } from "@/components/ErrorBoundary";

const prompt = Prompt({
  subsets: ["thai", "latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-prompt",
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  style: ["normal", "italic"],
  variable: "--font-playfair",
  display: "swap",
});

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-cormorant",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Aura Bistro - ร้านอาหารสวนไทย",
  description: "ระบบสั่งอาหารผ่าน QR Code - Aura Bistro Thai Garden Kitchen",
};

export const viewport: Viewport = {
  themeColor: "#FAF6F0",
  width: "device-width",
  initialScale: 1,
  // Pinch-to-zoom stays enabled — disabling it is a WCAG 1.4.4 failure.
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="th"
      className={`${prompt.variable} ${playfair.variable} ${cormorant.variable}`}
    >
      <body className={`min-h-screen antialiased ${prompt.className}`}>
        <ErrorBoundary>{children}</ErrorBoundary>
      </body>
    </html>
  );
}
