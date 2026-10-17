"use client";

import { Component, ReactNode } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import Link from "next/link";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

const COLORS = {
  primary: "#B85C38",
  primaryDark: "#8B3F1A",
  primaryLight: "#F4DCC4",
  bg: "#FAF6F0",
  surface: "#FFFFFF",
  text: "#2C2620",
  textMuted: "#6B5F54",
  danger: "#A03826",
};

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: any) {
    // Log to error tracking service (e.g., Sentry)
    console.error("[ErrorBoundary]", error, info);
  }

  reset = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div
          className="min-h-screen flex items-center justify-center p-6"
          style={{ background: COLORS.bg }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-md text-center p-8 rounded-3xl"
            style={{
              background: COLORS.surface,
              boxShadow: "0 24px 60px -12px rgba(139, 63, 26, 0.2)",
              border: "1px solid rgba(232, 223, 208, 0.5)",
            }}
          >
            <motion.div
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              className="w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center text-5xl"
              style={{
                background: `linear-gradient(135deg, ${COLORS.primaryLight} 0%, #fce7e7 100%)`,
              }}
            >
              🌿
            </motion.div>

            <h1
              className="text-3xl font-bold mb-2"
              style={{
                color: COLORS.text,
                fontFamily: "'Playfair Display', serif",
                fontStyle: "italic",
              }}
            >
              เกิดข้อผิดพลาด
            </h1>
            <p className="text-sm mb-6" style={{ color: COLORS.textMuted }}>
              Something went wrong. ขออภัยในความไม่สะดวก
            </p>

            {this.state.error && (
              <details
                className="text-left mb-6 p-3 rounded-xl text-xs"
                style={{ background: COLORS.bg, color: COLORS.danger }}
              >
                <summary className="cursor-pointer font-medium mb-1">
                  รายละเอียด
                </summary>
                <code className="block whitespace-pre-wrap break-all">
                  {this.state.error.message}
                </code>
              </details>
            )}

            <div className="flex gap-3 justify-center">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={this.reset}
                className="px-5 py-2.5 rounded-full text-white text-sm font-medium flex items-center gap-2"
                style={{
                  background: `linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.primaryDark} 100%)`,
                  boxShadow: "0 8px 20px -4px rgba(184, 92, 56, 0.4)",
                }}
              >
                <RefreshCw size={14} /> ลองอีกครั้ง
              </motion.button>

              <Link href="/">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-5 py-2.5 rounded-full text-sm font-medium flex items-center gap-2"
                  style={{
                    background: COLORS.bg,
                    color: COLORS.textMuted,
                    border: "1px solid rgba(232, 223, 208, 0.8)",
                  }}
                >
                  <Home size={14} /> กลับหน้าหลัก
                </motion.button>
              </Link>
            </div>
          </motion.div>
        </div>
      );
    }

    return this.props.children;
  }
}
