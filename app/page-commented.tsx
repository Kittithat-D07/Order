// ===============================================
// 📄 หน้าแรกของเว็บ (Homepage / Login Selection)
// ===============================================
// หน้านี้คือ: "หน้าเลือกบทบาทพนักงาน"
// ให้พนักงานเลือกว่าจะเข้าสู่ระบบในฐานะอะไร
// เช่น ครัว, เสิร์ฟ, หรือ ผู้จัดการ
// ===============================================

// "use client" = บอก Next.js ว่าไฟล์นี้ทำงานฝั่ง Client (Browser)
// เพราะมีการใช้ useState, useEffect, onClick (มีการโต้ตอบ)
"use client";

// ===== Import Library =====
// useState = เก็บค่าที่เปลี่ยนแปลงได้ (เช่น ตัวเลข PIN, สถานะ loading)
import { useState } from "react";

// framer-motion = Library ทำ Animation (เคลื่อนไหวสวยๆ)
// motion = ใช้ห่อ element เพื่อใส่ animation
// AnimatePresence = ใช้กับ element ที่ปรากฏ/หายไป (เช่น modal)
import { motion, AnimatePresence } from "framer-motion";

// lucide-react = Icon library (รูปภาพสวยๆ)
// ChefHat = หมวกเชฟ, Utensils = ช้อนส้อม, Settings = เกียร์
// Sparkles = ประกาย, ArrowRight = ลูกศรขวา, Lock = กุญแจ, X = กากบาท
import { ChefHat, Utensils, Settings, Sparkles, ArrowRight, Lock, X } from "lucide-react";

// useStaffSession = Custom Hook สำหรับจัดการ Session การ login
// StaffRole = Type ของบทบาท (kitchen, server, admin)
import { useStaffSession, StaffRole } from "@/hooks/useStaffSession";

// Import UI components พิเศษ (เอฟเฟกต์สวยๆ)
// BlurFade = ค่อยๆ ปรากฏ + เบลอ
// GradientBlob = วงกลมสีไล่ระดับ
// FloatingElement = ลอยขึ้นลง
import { BlurFade, GradientBlob, FloatingElement } from "@/components/ui/magic-effects";

// useRouter = ใช้เปลี่ยนหน้า (เหมือนกดลิงก์)
import { useRouter } from "next/navigation";

// useEffect = ทำงานเมื่อ component โหลด หรือค่าเปลี่ยน
import { useEffect } from "react";

// ===== กำหนดรูปแบบข้อมูล (Interface) =====
// บอกว่า "RoleOption" มีหน้าตาแบบนี้
interface RoleOption {
  role: StaffRole;              // บทบาท (kitchen/server/admin)
  icon: typeof ChefHat;         // ไอคอน (component ของ lucide)
  title: string;                // ชื่อบทบาท
  subtitle: string;             // คำอธิบาย
  gradient: string;            // สีไล่ระดับ (Tailwind class)
  shadowColor: string;          // สีเงา
  hoverColor: string;           // สีตอนเอาเมาส์ชี้
  emoji: string;                // อิโมจิ
}

// ===== รายการบทบาททั้ง 3 ตัว =====
// Array ของ RoleOption - เก็บข้อมูลทั้ง 3 บทบาท
const roleOptions: RoleOption[] = [
  // 🟠 พนักงานครัว - สีส้ม/เหลือง (ร้อนแรงเหมือนไฟ)
  {
    role: "kitchen",
    icon: ChefHat,
    title: "พนักงานครัว",
    subtitle: "ดูออร์เดอร์ที่เข้าครัว ทำอาหาร",
    gradient: "from-orange-500 to-amber-500",     // สีพื้นหลัง: ไล่ส้ม→เหลือง
    shadowColor: "shadow-orange-500/40",          // เงาสีส้ม 40% โปร่งใส
    hoverColor: "hover:border-orange-400",        // ขอบเปลี่ยนเป็นส้มเมื่อชี้
    emoji: "👨‍🍳",
  },
  // 🔵 พนักงานเสิร์ฟ - สีฟ้า/คราม (เย็น น้ำ)
  {
    role: "server",
    icon: Utensils,
    title: "พนักงานเสิร์ฟ",
    subtitle: "รับออร์เดอร์ เสิร์ฟอาหาร",
    gradient: "from-blue-500 to-cyan-500",        // สีพื้นหลัง: ไล่ฟ้า→คราม
    shadowColor: "shadow-blue-500/40",
    hoverColor: "hover:border-blue-400",
    emoji: "🍽️",
  },
  // 🟣 ผู้จัดการ - สีม่วง/ชมพู (หรูหรา)
  {
    role: "admin",
    icon: Settings,
    title: "ผู้จัดการ",
    subtitle: "จัดการเมนู โต๊ะ รายงาน (ต้องใส่ PIN)",
    gradient: "from-purple-500 to-pink-500",      // สีพื้นหลัง: ไล่ม่วง→ชมพู
    shadowColor: "shadow-purple-500/40",
    hoverColor: "hover:border-purple-400",
    emoji: "👔",
  },
];

// ===============================================
// 🎬 Main Component: HomePage
// ===============================================
// export default = ส่งออก Component นี้เป็น Component หลัก
// Next.js จะเอาไปแสดงที่หน้า "/"
export default function HomePage() {
  // ===== State & Hooks =====
  // useRouter() = ใช้เปลี่ยนหน้า (redirect)
  const router = useRouter();
  
  // useStaffSession() = Custom Hook จัดการ session
  // - quickLogin = login แบบเร็ว (ไม่ต้องใส่ PIN)
  // - login = login แบบปกติ (ต้องใส่ PIN)
  // - session = ข้อมูลการ login (ถ้ายังไม่ login = null)
  // - hydrated = โหลด session จาก localStorage เสร็จยัง
  const { quickLogin, login, session, hydrated } = useStaffSession();
  
  // ===== useState = เก็บค่าที่เปลี่ยนได้ =====
  
  // loading = เก็บบทบาทที่กำลังโหลด (null = ไม่มี)
  // ใช้แสดง spinner ตอนกดปุ่ม
  const [loading, setLoading] = useState<StaffRole | null>(null);
  
  // showPinModal = true/false (เปิด modal ใส่ PIN ไหม)
  const [showPinModal, setShowPinModal] = useState(false);
  
  // pin = เก็บตัวเลข PIN ที่กด (เช่น "1234")
  const [pin, setPin] = useState("");
  
  // pinError = ข้อความ error (เช่น "PIN ไม่ถูกต้อง")
  const [pinError, setPinError] = useState("");
  
  // pinLoading = true/false (กำลังตรวจสอบ PIN ไหม)
  const [pinLoading, setPinLoading] = useState(false);

  // ===== useEffect: ทำงานเมื่อ component โหลด หรือค่าเปลี่ยน =====
  // ถ้า login แล้ว → redirect ไปหน้าที่เหมาะสม
  useEffect(() => {
    // ถ้ายังโหลด session ไม่เสร็จ → รอก่อน
    if (!hydrated) return;
    
    // ถ้ายังไม่ login → อยู่หน้านี้ต่อ
    if (!session) return;

    // Map บทบาท → URL
    // kitchen → /kitchen
    // server → /server
    // admin → /admin
    const roleMap: Record<StaffRole, string> = {
      kitchen: "/kitchen",
      server: "/server",
      admin: "/admin",
    };
    
    // router.replace = เปลี่ยนหน้า (แทนที่ URL ไม่เก็บ history)
    router.replace(roleMap[session.role]);
  }, [hydrated, session, router]); // ทำใหม่เมื่อค่าเหล่านี้เปลี่ยน

  // ===== ฟังก์ชัน: เมื่อกดเลือกบทบาท =====
  const handleSelectRole = async (role: StaffRole) => {
    // ถ้าเป็น admin → ต้องใส่ PIN ก่อน
    if (role === "admin") {
      setShowPinModal(true);  // เปิด modal
      setPin("");             // ล้าง PIN
      setPinError("");        // ล้าง error
      return;                 // ออกจากฟังก์ชัน
    }

    // ===== ถ้าเป็น kitchen/server → login เลย =====
    setLoading(role);  // แสดง spinner
    
    // quickLogin = login แบบไม่ต้องใส่ PIN (เร็ว)
    quickLogin(role);

    // รอ 300ms แล้วเปลี่ยนหน้า
    setTimeout(() => {
      const roleMap: Record<StaffRole, string> = {
        kitchen: "/kitchen",
        server: "/server",
        admin: "/admin",
      };
      router.push(roleMap[role]); // เปลี่ยนหน้า
    }, 300);
  };

  // ===== ฟังก์ชัน: เมื่อกดยืนยัน PIN =====
  const handlePinSubmit = async () => {
    // ตรวจสอบ PIN ต้องมีอย่างน้อย 4 หลัก
    if (pin.length < 4) {
      setPinError("PIN ต้องมีอย่างน้อย 4 หลัก");
      return;
    }

    setPinLoading(true);  // แสดง loading
    setPinError("");      // ล้าง error

    // เรียก login() เพื่อตรวจสอบ PIN
    // result = { ok: true/false, error: "ข้อความ error" }
    const result = await login("admin", pin);

    // ถ้า PIN ผิด
    if (!result.ok) {
      setPinError(result.error || "PIN ไม่ถูกต้อง");
      setPin("");              // ล้าง PIN
      setPinLoading(false);    // หยุด loading
      return;
    }

    // ถ้า PIN ถูก → ปิด modal แล้วไปหน้า admin
    setShowPinModal(false);
    setPinLoading(false);
    router.push("/admin");
  };

  // ===== ฟังก์ชัน: เมื่อกดตัวเลขบนแป้น PIN =====
  const handlePinKeyPress = (digit: string) => {
    // ถ้า PIN ครบ 6 หลักแล้ว → ไม่รับเพิ่ม
    if (pin.length >= 6) return;
    
    // เพิ่มตัวเลขเข้าไปใน PIN
    setPin((prev) => prev + digit);
    setPinError(""); // ล้าง error
  };

  // ===== ฟังก์ชัน: กดลบตัวเลข (←) =====
  const handlePinDelete = () => {
    // ลบตัวสุดท้ายออก
    setPin((prev) => prev.slice(0, -1));
    setPinError("");
  };

  // ===== ถ้ายังโหลด session ไม่เสร็จ → แสดง loading spinner =====
  if (!hydrated) {
    return (
      // min-h-screen = สูงเต็มหน้าจอ
      // flex items-center justify-center = จัดกึ่งกลาง
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50">
        {/* motion.div = div ที่มี animation */}
        <motion.div
          animate={{ rotate: 360 }}                          // หมุน 360 องศา
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }} // 1 วินาที วนซ้ำ
          className="w-12 h-12 border-4 border-stone-200 border-t-orange-500 rounded-full" // วงกลม
        />
      </div>
    );
  }

  // ===== UI หลัก: หน้าเลือกบทบาท =====
  return (
    // min-h-screen = สูงเต็มจอ
    // bg-gradient-to-br = พื้นหลังไล่สี (บนล่าง-ซ้ายขวา)
    // relative overflow-hidden = ซ้อน element ได้ + ตัดส่วนเกิน
    // flex items-center justify-center = จัดกึ่งกลาง
    // p-4 = padding 4 หน่วย
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 relative overflow-hidden flex items-center justify-center p-4">
      
      {/* ===== Background blobs (วงกลมสีพื้นหลัง) ===== */}
      <GradientBlob className="top-[-150px] left-[-100px] w-96 h-96" color="bg-orange-300/40" />
      <GradientBlob className="top-[20%] right-[-100px] w-96 h-96" color="bg-rose-300/40" delay={2} />
      <GradientBlob className="bottom-[-100px] left-[20%] w-96 h-96" color="bg-amber-300/40" delay={4} />

      {/* ===== Floating Sparkles (ประกายลอย) ===== */}
      <FloatingElement className="top-20 left-8" delay={0}>
        <Sparkles className="w-8 h-8 text-orange-400/40" />
      </FloatingElement>
      <FloatingElement className="bottom-32 right-12" delay={1}>
        <Sparkles className="w-6 h-6 text-rose-400/40" />
      </FloatingElement>

      {/* ===== Container หลัก ===== */}
      {/* max-w-md = กว้างสุด 28rem */}
      {/* w-full = เต็มความกว้าง */}
      {/* relative z-10 = อยู่ชั้นบนสุด */}
      <div className="max-w-md w-full relative z-10">
        
        {/* ===== Header (ส่วนหัว) ===== */}
        {/* BlurFade = effect ค่อยๆ ปรากฏ + เบลอ */}
        <BlurFade delay={0.1}>
          <div className="text-center mb-8">
            {/* โลโก้ร้าน */}
            <motion.div
              initial={{ scale: 0, rotate: -180 }}        // เริ่ม: เล็ก + หมุนกลับ
              animate={{ scale: 1, rotate: 0 }}          // จบ: ใหญ่ปกติ
              transition={{ type: "spring", duration: 0.8 }} // แบบสปริง
              className="w-20 h-20 mx-auto mb-4 rounded-3xl bg-gradient-to-br from-orange-500 via-amber-500 to-rose-500 flex items-center justify-center shadow-2xl shadow-orange-500/40"
            >
              <span className="text-4xl">🍜</span>  {/* อิโมจิราเมง */}
            </motion.div>
            
            {/* ข้อความต้อนรับ */}
            <h1 className="text-3xl font-bold text-stone-800 mb-2">
              ยินดีต้อนรับ
            </h1>
            <p className="text-stone-600 text-sm">
              เลือกบทบาทของคุณเพื่อเริ่มต้นใช้งาน
            </p>
          </div>
        </BlurFade>

        {/* ===== รายการบทบาท (Role Cards) ===== */}
        {/* space-y-3 = เว้นระยะห่างแต่ละ card 12px */}
        <div className="space-y-3">
          {/* .map() = วนลูปสร้าง card ตาม roleOptions */}
          {roleOptions.map((option, idx) => {
            // ดึงไอคอนออกมา
            const Icon = option.icon;
            // เช็คว่า card นี้กำลัง loading อยู่ไหม
            const isLoading = loading === option.role;
            
            return (
              // BlurFade = animation ค่อยๆ ปรากฏ
              // key={option.role} = key ต้องไม่ซ้ำ
              // delay = 0.2 + idx*0.1 = ปรากฏทีละ card
              <BlurFade key={option.role} delay={0.2 + idx * 0.1}>
                
                {/* motion.button = ปุ่มที่มี animation */}
                <motion.button
                  onClick={() => handleSelectRole(option.role)} // เมื่อกด
                  disabled={!!loading}                            // ปิดปุ่มถ้ากำลัง loading
                  whileHover={{ scale: 1.02, y: -2 }}              // ชี้: ขยาย + ยกขึ้น
                  whileTap={{ scale: 0.98 }}                       // กด: หด
                  // w-full = เต็มความกว้าง
                  // text-left = ชิดซ้าย
                  // rounded-2xl = มุมโค้ง
                  // border-2 border-stone-200 = ขอบสีเทา
                  // bg-white = พื้นหลังขาว
                  // p-4 = padding 16px
                  // shadow-md = เงา
                  // hover:shadow-xl = เงาใหญ่ตอนชี้
                  // ${option.hoverColor} = เปลี่ยนสีขอบตอนชี้
                  // ${isLoading ? "opacity-60" : ""} = จางลงถ้า loading
                  className={`w-full text-left rounded-2xl border-2 border-stone-200 bg-white p-4 shadow-md hover:shadow-xl transition-all duration-200 ${option.hoverColor} ${isLoading ? "opacity-60" : ""}`}
                >
                  {/* flex items-center gap-4 = จัดแนวนอน ห่างกัน 16px */}
                  <div className="flex items-center gap-4">
                    
                    {/* ไอคอน */}
                    <motion.div
                      whileHover={{ scale: 1.1, rotate: 5 }} // ชี้: ขยาย + เอียง
                      // flex-shrink-0 = ไม่หด
                      // w-14 h-14 = 56x56px
                      // rounded-2xl = มุมโค้ง
                      // bg-gradient-to-br = ไล่สี
                      // ${option.gradient} = สีตามบทบาท
                      // flex items-center justify-center = จัดกึ่งกลาง
                      // ${option.shadowColor} = สีเงา
                      // shadow-lg = เงาใหญ่
                      className={`flex-shrink-0 w-14 h-14 rounded-2xl bg-gradient-to-br ${option.gradient} flex items-center justify-center ${option.shadowColor} shadow-lg`}
                    >
                      {/* ถ้า loading → แสดง spinner, ถ้าไม่ → แสดงไอคอน */}
                      {isLoading ? (
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                          className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full"
                        />
                      ) : (
                        <Icon size={24} className="text-white" />
                      )}
                    </motion.div>
                    
                    {/* ข้อความ */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{option.emoji}</span>
                        <h3 className="font-bold text-stone-800">{option.title}</h3>
                        {/* ถ้าเป็น admin → แสดงรูปกุญแจ */}
                        {option.role === "admin" && (
                          <Lock size={12} className="text-purple-500" />
                        )}
                      </div>
                      <p className="text-sm text-stone-500">{option.subtitle}</p>
                    </div>
                    
                    {/* ลูกศร (เคลื่อนไหว) */}
                    {!isLoading && (
                      <motion.div
                        animate={{ x: [0, 4, 0] }}                              // ขยับไป-กลับ
                        transition={{ duration: 1.5, repeat: Infinity }}      // 1.5 วินาที วนซ้ำ
                      >
                        <ArrowRight size={20} className="text-stone-400" />
                      </motion.div>
                    )}
                  </div>
                </motion.button>
              </BlurFade>
            );
          })}
        </div>

        {/* ===== Demo Link (ลิงก์ดู UI) ===== */}
        <BlurFade delay={0.6}>
          <motion.a
            href="/demo"                                    // ลิงก์ไปหน้า demo
            whileHover={{ scale: 1.02 }}                    // ชี้: ขยาย
            whileTap={{ scale: 0.98 }}                      // กด: หด
            // mt-6 = เว้นบน 24px
            // w-full = เต็มความกว้าง
            // text-center = จัดกึ่งกลาง
            // block = แสดงเป็นบล็อก
            // rounded-2xl = มุมโค้ง
            // border-2 border-dashed border-stone-300 = ขอบเส้นประ
            // bg-stone-50 = พื้นหลังเทาอ่อน
            // p-4 = padding 16px
            // text-stone-500 text-sm = ข้อความเทา เล็ก
            // hover:bg-stone-100 = พื้นหลังเข้มขึ้นตอนชี้
            // transition-colors = เปลี่ยนสีเนียนๆ
            className="mt-6 w-full text-center block rounded-2xl border-2 border-dashed border-stone-300 bg-stone-50 p-4 text-stone-500 text-sm hover:bg-stone-100 transition-colors"
          >
            ดู UI Demo (ไม่ต้อง login)
          </motion.a>
        </BlurFade>
      </div>

      {/* =============================================== */}
      {/* 🔐 PIN Modal (หน้าต่างใส่ PIN สำหรับ Admin) */}
      {/* =============================================== */}
      {/* AnimatePresence = จัดการ animation ตอนเปิด/ปิด modal */}
      <AnimatePresence>
        {/* ถ้า showPinModal = true → แสดง modal */}
        {showPinModal && (
          
          // Backdrop (พื้นหลังมืด)
          <motion.div
            initial={{ opacity: 0 }}                  // เริ่ม: โปร่งใส
            animate={{ opacity: 1 }}                  // จบ: ทึบ
            exit={{ opacity: 0 }}                     // ออก: โปร่งใส
            onClick={() => !pinLoading && setShowPinModal(false)} // คลิกพื้นหลังปิด
            // fixed inset-0 = เต็มจอ
            // z-50 = อยู่ชั้นบนสุด
            // bg-black/60 = พื้นหลังดำ 60% โปร่งใส
            // backdrop-blur-sm = เบลอพื้นหลัง
            // flex items-center justify-center = จัดกึ่งกลาง
            // p-4 = padding
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          >
            
            {/* กล่อง Modal */}
            <motion.div
              initial={{ scale: 0.8, y: 20 }}   // เริ่ม: เล็ก + เลื่อนลง
              animate={{ scale: 1, y: 0 }}      // จบ: ปกติ
              exit={{ scale: 0.8, y: 20 }}      // ออก: เล็ก + เลื่อนลง
              onClick={(e) => e.stopPropagation()} // คลิกไม่ทะลุไป backdrop
              // bg-white = พื้นหลังขาว
              // rounded-3xl = มุมโค้งมาก
              // shadow-2xl = เงาใหญ่มาก
              // p-6 = padding 24px
              // max-w-sm = กว้างสุด 24rem
              // w-full = เต็มความกว้าง
              className="bg-white rounded-3xl shadow-2xl p-6 max-w-sm w-full"
            >
              
              {/* ===== Header Modal ===== */}
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                  {/* ไอคอนกุญแจ */}
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                    <Lock size={18} className="text-white" />
                  </div>
                  <h2 className="text-lg font-bold text-stone-800">ใส่ PIN ผู้จัดการ</h2>
                </div>
                
                {/* ปุ่มปิด (X) */}
                <button
                  onClick={() => setShowPinModal(false)}
                  disabled={pinLoading}  // ปิดไม่ได้ตอน loading
                  className="w-8 h-8 rounded-full hover:bg-stone-100 flex items-center justify-center disabled:opacity-50"
                >
                  <X size={18} className="text-stone-500" />
                </button>
              </div>

              {/* ===== PIN Dots (จุดแสดงตัวเลข PIN) ===== */}
              {/* flex justify-center gap-3 = จัดกึ่งกลาง ห่างกัน 12px */}
              <div className="flex justify-center gap-3 mb-4">
                {/* วนลูปสร้าง 6 จุด */}
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <motion.div
                    key={i}
                    initial={false}                            // ไม่มี animation เริ่มต้น
                    // ถ้า pin.length > i → ขยาย + เปลี่ยนเป็นสีม่วง
                    animate={{
                      scale: pin.length > i ? 1.2 : 1,
                      backgroundColor: pin.length > i ? "#a855f7" : "#e7e5e4",
                    }}
                    className="w-4 h-4 rounded-full bg-stone-200"
                  />
                ))}
              </div>

              {/* ===== Error Message ===== */}
              {/* ถ้ามี error → แสดงข้อความแดง */}
              {pinError && (
                <motion.p
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center text-red-500 text-sm mb-3"
                >
                  {pinError}
                </motion.p>
              )}

              {/* ===== Number Pad (แป้นตัวเลข) ===== */}
              {/* grid grid-cols-3 gap-2 = ตาราง 3 คอลัมน์ ห่าง 8px */}
              <div className="grid grid-cols-3 gap-2">
                {/* ตัวเลข 1-9 */}
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                  <motion.button
                    key={n}
                    whileTap={{ scale: 0.92 }}                   // กด: หด
                    onClick={() => handlePinKeyPress(String(n))} // กดตัวเลข
                    disabled={pinLoading}                       // ปิดตอน loading
                    // aspect-square = สี่เหลี่ยมจัตุรัส
                    // rounded-2xl = มุมโค้ง
                    // bg-stone-100 = พื้นหลังเทาอ่อน
                    // hover:bg-stone-200 = เข้มขึ้นตอนชี้
                    // text-2xl font-semibold = ตัวอักษรใหญ่ หนา
                    className="aspect-square rounded-2xl bg-stone-100 hover:bg-stone-200 text-2xl font-semibold text-stone-800 transition-colors disabled:opacity-50"
                  >
                    {n}
                  </motion.button>
                ))}
                
                {/* ช่องว่าง (กดไม่ได้) */}
                <div />
                
                {/* ตัวเลข 0 */}
                <motion.button
                  whileTap={{ scale: 0.92 }}
                  onClick={() => handlePinKeyPress("0")}
                  disabled={pinLoading}
                  className="aspect-square rounded-2xl bg-stone-100 hover:bg-stone-200 text-2xl font-semibold text-stone-800 transition-colors disabled:opacity-50"
                >
                  0
                </motion.button>
                
                {/* ปุ่มลบ (←) */}
                <motion.button
                  whileTap={{ scale: 0.92 }}
                  onClick={handlePinDelete}  // ลบตัวสุดท้าย
                  disabled={pinLoading}
                  // hover:bg-red-100 = แดงอ่อนตอนชี้
                  // text-stone-600 hover:text-red-600 = ตัวอักษรแดงตอนชี้
                  className="aspect-square rounded-2xl bg-stone-100 hover:bg-red-100 text-stone-600 hover:text-red-600 transition-colors flex items-center justify-center disabled:opacity-50"
                >
                  ←
                </motion.button>
              </div>

              {/* ===== ปุ่มยืนยัน ===== */}
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={handlePinSubmit}                        // กดยืนยัน
                disabled={pin.length < 4 || pinLoading}         // ปิดถ้า PIN < 4 หลัก
                // w-full = เต็มความกว้าง
                // mt-4 = เว้นบน 16px
                // py-3 = padding บน-ล่าง 12px
                // rounded-2xl = มุมโค้ง
                // bg-gradient-to-r = ไล่สีซ้าย→ขวา
                // from-purple-500 to-pink-500 = ม่วง→ชมพู
                // text-white font-semibold = ตัวอักษรขาว หนา
                // disabled:opacity-50 = จางลงถ้าปิด
                // flex items-center justify-center = จัดกึ่งกลาง
                // gap-2 = ห่าง 8px
                className="w-full mt-4 py-3 rounded-2xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {/* ถ้า loading → แสดง spinner + ข้อความ, ถ้าไม่ → แสดงปุ่มปกติ */}
                {pinLoading ? (
                  <>
                    {/* Spinner หมุนๆ */}
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                      className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                    />
                    กำลังตรวจสอบ...  {/* ข้อความตอน loading */}
                  </>
                ) : (
                  <>
                    เข้าสู่ระบบ  {/* ข้อความปกติ */}
                    <ArrowRight size={18} />  {/* ลูกศร */}
                  </>
                )}
              </motion.button>

              {/* ข้อความเล็กๆ ด้านล่าง */}
              <p className="text-center text-xs text-stone-400 mt-3">
                🔒 เฉพาะผู้จัดการเท่านั้น
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
