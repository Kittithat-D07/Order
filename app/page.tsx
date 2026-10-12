"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ChefHat,
  Sparkles,
  ArrowRight,
  Smartphone,
  Settings,
  Star,
  Flame,
  Heart,
  Utensils,
} from "lucide-react";
import {
  BlurFade,
  GradientBlob,
  FloatingElement,
  Shimmer,
} from "@/components/ui/magic-effects";
import { Card, CardContent } from "@/components/ui/card";

const staffRoles = [
  {
    href: "/kitchen",
    icon: ChefHat,
    title: "หน้าจอครัว",
    desc: "ดูออร์เดอร์ ทำอาหาร",
    gradient: "from-red-500 to-orange-500",
    shadow: "shadow-red-500/30",
  },
  {
    href: "/server",
    icon: Utensils,
    title: "หน้าจอเสริฟ์",
    desc: "เสิร์ฟอาหาร จัดการโต๊ะ",
    gradient: "from-blue-500 to-cyan-500",
    shadow: "shadow-blue-500/30",
  },
  {
    href: "/admin",
    icon: Settings,
    title: "ผู้จัดการ / แอดมิน",
    desc: "จัดการเมนู โต๊ะ รายงาน",
    gradient: "from-stone-800 to-stone-900",
    shadow: "shadow-stone-700/30",
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-stone-50 relative overflow-hidden">
      {/* Animated gradient blobs */}
      <GradientBlob className="top-[-150px] right-[-150px]" color="bg-orange-300/40" />
      <GradientBlob className="top-[40%] left-[-150px]" color="bg-amber-300/40" delay={2} />
      <GradientBlob className="bottom-[-150px] right-[20%]" color="bg-red-300/30" delay={4} />

      {/* Floating decorations */}
      <FloatingElement className="top-24 left-8" delay={0}>
        <Sparkles className="w-7 h-7 text-orange-400/60" />
      </FloatingElement>
      <FloatingElement className="top-44 right-12" delay={1}>
        <Flame className="w-6 h-6 text-red-400/60" />
      </FloatingElement>
      <FloatingElement className="bottom-44 left-12" delay={2}>
        <Heart className="w-6 h-6 text-pink-400/60" />
      </FloatingElement>
      <FloatingElement className="bottom-24 right-16" delay={3}>
        <Star className="w-7 h-7 text-amber-400/60" />
      </FloatingElement>

      <main className="relative z-10 max-w-md mx-auto px-6 pt-12 pb-12 sm:max-w-2xl">
        {/* Hero Icon */}
        <BlurFade delay={0.1}>
          <div className="flex justify-center mb-6">
            <motion.div
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="relative"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-orange-400 to-amber-500 rounded-3xl blur-2xl opacity-50 animate-pulse" />
              <div className="relative w-20 h-20 rounded-3xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shadow-2xl shadow-orange-500/40 hover-lift">
                <ChefHat size={40} className="text-white" strokeWidth={2.2} />
              </div>
              <motion.div
                animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-gradient-to-br from-amber-300 to-orange-400 shadow-lg"
              />
            </motion.div>
          </div>
        </BlurFade>

        {/* Title */}
        <BlurFade delay={0.2}>
          <div className="text-center mb-10">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/70 backdrop-blur-sm text-orange-700 text-xs font-semibold mb-4 shadow-sm border border-orange-200/50"
            >
              <Sparkles size={12} className="text-amber-500" />
              ระบบจัดการร้านอาหาร
            </motion.div>
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-2">
              ร้านอาหาร
              <br />
              <span className="bg-gradient-to-r from-orange-500 via-amber-500 to-red-500 bg-clip-text text-transparent animate-gradient bg-[length:200%_auto]">
                QR Order
              </span>
            </h1>
            <p className="text-stone-600 text-sm sm:text-base mt-2">
              เลือกบทบาทของคุณเพื่อเริ่มใช้งาน
            </p>
          </div>
        </BlurFade>

        {/* Staff Roles */}
        <BlurFade delay={0.3}>
          <div className="space-y-3 mb-6">
            <div className="flex items-center gap-2 px-1">
              <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
                👨‍🍳 สำหรับพนักงาน
              </span>
              <div className="flex-1 h-px bg-gradient-to-r from-stone-200 to-transparent" />
            </div>

            {staffRoles.map((role, idx) => {
              const Icon = role.icon;
              return (
                <motion.div
                  key={role.href}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + idx * 0.1 }}
                >
                  <Link href={role.href} className="block group">
                    <Card className={`overflow-hidden hover-lift border-0 shadow-md hover:shadow-2xl hover:shadow-${role.shadow} transition-all duration-300`}>
                      <div className="relative">
                        <div className={`absolute inset-0 bg-gradient-to-r ${role.gradient} opacity-0 group-hover:opacity-5 transition-opacity`} />
                        <div className="relative flex items-center gap-4 p-4">
                          <motion.div
                            whileHover={{ scale: 1.1, rotate: 5 }}
                            className={`flex-shrink-0 w-14 h-14 rounded-2xl bg-gradient-to-br ${role.gradient} flex items-center justify-center shadow-lg`}
                          >
                            <Icon size={24} className="text-white" />
                          </motion.div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-base text-stone-800">{role.title}</h3>
                            <p className="text-sm text-stone-500">{role.desc}</p>
                          </div>
                          <motion.div
                            whileHover={{ x: 4 }}
                            transition={{ type: "spring", stiffness: 400 }}
                          >
                            <ArrowRight size={20} className="text-stone-400" />
                          </motion.div>
                        </div>
                      </div>
                    </Card>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </BlurFade>

        {/* Customer Section */}
        <BlurFade delay={0.6}>
          <div className="space-y-3 mb-8">
            <div className="flex items-center gap-2 px-1">
              <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
                📱 สำหรับลูกค้า
              </span>
              <div className="flex-1 h-px bg-gradient-to-r from-stone-200 to-transparent" />
            </div>

            <Link href="/menu?table=t01-demo-aaaa" className="block group">
              <Card className="overflow-hidden border-0 shadow-md hover:shadow-2xl hover:shadow-green-500/30 transition-all duration-300">
                <div className="relative bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500 p-4 overflow-hidden">
                  <Shimmer />
                  <div className="relative z-10 flex items-center gap-4">
                    <motion.div
                      animate={{ y: [0, -3, 0] }}
                      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                      className="flex-shrink-0 w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg"
                    >
                      <Smartphone size={24} className="text-white" />
                    </motion.div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-base text-white">สแกน QR โต๊ะ T01</h3>
                        <Badge variant="success" className="bg-white/20 text-white border-white/30 text-[10px]">
                          ทดสอบ
                        </Badge>
                      </div>
                      <p className="text-sm text-green-50">ดูเมนูและสั่งอาหาร</p>
                    </div>
                    <motion.div
                      whileHover={{ x: 4 }}
                      transition={{ type: "spring", stiffness: 400 }}
                    >
                      <ArrowRight size={20} className="text-white" />
                    </motion.div>
                  </div>
                </div>
              </Card>
            </Link>
          </div>
        </BlurFade>

        {/* Features removed */}

        {/* Demo link */}
        <BlurFade delay={0.7}>
          <Link href="/demo" className="block mb-6">
            <Card className="border-0 bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-rose-500/10 hover:from-purple-500/20 hover:via-pink-500/20 hover:to-rose-500/20 transition-all">
              <CardContent className="p-3 flex items-center justify-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-500" />
                <span className="text-sm font-medium text-stone-700">ดู UI Demo (ไม่ต้อง login)</span>
                <ArrowRight className="w-4 h-4 text-stone-500" />
              </CardContent>
            </Card>
          </Link>
        </BlurFade>
      </main>
    </div>
  );
}
