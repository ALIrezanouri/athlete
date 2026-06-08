"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import {
  User,
  Wallet,
  Bell,
  Heart,
  HelpCircle,
  Info,
  LogOut,
  ChevronLeft,
  X,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  Pencil,
  CheckCircle2,
  Globe,
  Dumbbell,
  Loader2,
  Wrench,
  Settings,
  Trophy,
  Flame,
  Calendar,
  CalendarCheck,
  TrendingUp,
  Sun,
  Moon,
  BarChart3,
  Award,
  PersonStanding,
  Ruler,
} from "lucide-react";
import Link from "next/link";
import { getProfile, updateProfile } from "@/app/actions/profile";
import { getWallet, getTransactions, topUpWallet } from "@/app/actions/wallet";
import { getWorkoutStats } from "@/app/actions/analytics";
import { getPersonalRecords } from "@/app/actions/analytics";
import { signOut } from "@/app/actions/auth";
import { getBookings } from "@/app/actions/bookings";
import { useGlobalEngine } from "@/lib/GlobalEngineContext";
import { useTheme } from "@/lib/ThemeProvider";

// ── Types ──
interface Transaction {
  id: string;
  amount: number;
  type: string;
  description: string | null;
  booking_id: string | null;
  created_at: string;
}

const TOP_UP_AMOUNTS = [500000, 1000000, 2000000, 5000000];

function getTransactionDisplay(type: string) {
  switch (type) {
    case "top_up": return { label: "شارژ", icon: ArrowDownLeft, color: "text-success", bg: "bg-success/15" };
    case "booking_charge": return { label: "پرداخت", icon: ArrowUpRight, color: "text-destructive", bg: "bg-destructive/15" };
    case "refund": return { label: "بازگشت", icon: ArrowDownLeft, color: "text-success", bg: "bg-success/15" };
    default: return { label: type, icon: ArrowUpRight, color: "text-foreground/40", bg: "bg-white/5" };
  }
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fa-IR", { month: "short", day: "numeric" });
}

// ── Animation ──
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05, delayChildren: 0.05 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] as const } },
};

// ── Main Component ──
export default function ProfilePage() {
  const router = useRouter();
  const { formatPrice, t } = useGlobalEngine();
  const { theme, toggleTheme } = useTheme();

  const [userName, setUserName] = useState("");
  const [totalSessions, setTotalSessions] = useState(0);
  const [totalHours, setTotalHours] = useState(0);
  const [prCount, setPrCount] = useState(0);
  const [memberSince, setMemberSince] = useState("");
  const [walletBalance, setWalletBalance] = useState(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isSavingName, setIsSavingName] = useState(false);
  const [isToppingUp, setIsToppingUp] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [saveNameError, setSaveNameError] = useState<string | null>(null);
  const [topUpError, setTopUpError] = useState<string | null>(null);

  const [editingName, setEditingName] = useState(false);
  const [editNameValue, setEditNameValue] = useState("");
  const [showTopUpModal, setShowTopUpModal] = useState(false);
  const [selectedTopUpAmount, setSelectedTopUpAmount] = useState(0);
  const [comingSoonToast, setComingSoonToast] = useState<string | null>(null);
  const [upcomingBookingsCount, setUpcomingBookingsCount] = useState(0);

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      setFetchError(null);
      try {
        // Parallelize all 6 independent server action calls
        const [profileResult, walletResult, txResult, statsResult, prResult, bookingsResult] =
          await Promise.all([
            getProfile(),
            getWallet(),
            getTransactions(20),
            getWorkoutStats({ period: "all" }),
            getPersonalRecords(),
            getBookings(),
          ]);

        // Handle profile result
        if (!profileResult.success || !profileResult.profile) throw new Error(profileResult.error || "Failed");
        const profile = profileResult.profile;
        setUserName(profile.full_name || "");
        setTotalSessions(profile.total_sessions);
        setMemberSince(new Date(profile.created_at).toLocaleDateString("fa-IR", { year: "numeric", month: "long" }));
        setEditNameValue(profile.full_name || "");

        // Handle wallet result
        if (walletResult.success && walletResult.wallet) setWalletBalance(walletResult.wallet.balance);

        // Handle transactions result
        if (txResult.success) setTransactions(txResult.transactions || []);

        // Handle workout stats result
        if (statsResult.success && statsResult.stats) {
          const mins = statsResult.stats.totalDuration || 0;
          setTotalHours(Math.round(mins / 60));
        }

        // Handle PR count result
        if (prResult.success && prResult.records) {
          setPrCount(prResult.records.length);
        }

        // Handle bookings result
        if (bookingsResult.success && bookingsResult.bookings) {
          const upcoming = bookingsResult.bookings.filter(b => b.status === "upcoming");
          setUpcomingBookingsCount(upcoming.length);
        }
      } catch (err) {
        setFetchError(err instanceof Error ? err.message : "Failed to load data");
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, []);

  async function handleLogout() {
    const result = await signOut();
    if (result.success) router.push("/login");
  }

  async function handleSaveName() {
    if (!editNameValue.trim()) return;
    setIsSavingName(true);
    setSaveNameError(null);
    try {
      const result = await updateProfile({ full_name: editNameValue.trim() });
      if (!result.success) throw new Error(result.error || "Failed");
      setUserName(editNameValue.trim());
      setEditingName(false);
    } catch (err) {
      setSaveNameError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setIsSavingName(false);
    }
  }

  async function handleTopUp() {
    if (!selectedTopUpAmount) return;
    setIsToppingUp(true);
    setTopUpError(null);
    try {
      const result = await topUpWallet(selectedTopUpAmount);
      if (!result.success) throw new Error(result.error || "Failed");
      const walletResult = await getWallet();
      if (walletResult.success && walletResult.wallet) setWalletBalance(walletResult.wallet.balance);
      const txResult = await getTransactions(20);
      if (txResult.success) setTransactions(txResult.transactions || []);
      setShowTopUpModal(false);
      setSelectedTopUpAmount(0);
    } catch (err) {
      setTopUpError(err instanceof Error ? err.message : "Failed to top up");
    } finally {
      setIsToppingUp(false);
    }
  }

  // ── Loading ──
  if (isLoading) {
    return (
      <div className="min-h-screen gradient-mesh flex items-center justify-center" dir="rtl">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="min-h-screen gradient-mesh flex flex-col items-center justify-center gap-4 px-6" dir="rtl">
        <p className="text-destructive text-sm text-center">{fetchError}</p>
        <button onClick={() => window.location.reload()} className="hevy-btn-primary px-6 py-2.5 text-sm">تلاش مجدد</button>
      </div>
    );
  }

  // ── Settings menu items ──
  const settingsItems = [
    { icon: Wrench, label: "🛠 ابزارها", href: "/tools", color: "text-warning" },
    { icon: Trophy, label: "دستاوردها", href: "/analytics", color: "text-chart-purple" },
    { icon: Bell, label: t("notifications"), href: null, color: "text-primary" },
    { icon: Heart, label: t("favorites"), href: null, color: "text-destructive" },
    { icon: HelpCircle, label: t("help"), href: null, color: "text-success" },
    { icon: Info, label: t("about"), href: null, color: "text-foreground/40" },
  ];

  return (
    <motion.div
      className="min-h-screen gradient-mesh pb-28"
      dir="rtl"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* ── Profile Hero ── */}
      <motion.div variants={itemVariants} className="px-4 pt-14 pb-2">
        <div className="flex items-center gap-4">
          {/* Avatar */}
          <div className="relative">
            <div className="w-[72px] h-[72px] rounded-2xl bg-gradient-to-br from-primary to-[#2563EB] flex items-center justify-center shadow-lg shadow-primary/20">
              <User className="w-9 h-9 text-foreground" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-lg bg-success flex items-center justify-center border-2 border-background">
              <span className="text-[8px] font-bold text-foreground">۳</span>
            </div>
          </div>

          {/* Name */}
          <div className="flex-1 min-w-0">
            {editingName ? (
              <div className="flex items-center gap-2">
                <input
                  type="text" value={editNameValue} onChange={(e) => setEditNameValue(e.target.value)}
                  className="flex-1 bg-hevy-elevated border border-white/10 rounded-xl px-3 py-2 text-foreground text-sm focus:border-primary focus:outline-none"
                  autoFocus
                />
                <button onClick={handleSaveName} disabled={isSavingName}
                  className="w-8 h-8 rounded-xl bg-success/15 flex items-center justify-center"
                >
                  {isSavingName ? <Loader2 className="w-4 h-4 animate-spin text-success" /> : <CheckCircle2 className="w-4 h-4 text-success" />}
                </button>
                <button onClick={() => { setEditingName(false); setEditNameValue(userName); setSaveNameError(null); }}
                  className="w-8 h-8 rounded-xl bg-destructive/15 flex items-center justify-center"
                >
                  <X className="w-4 h-4 text-destructive" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-foreground truncate">{userName || t("anonymous")}</h1>
                <button onClick={() => setEditingName(true)}
                  className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center"
                >
                  <Pencil className="w-3 h-3 text-foreground/40" />
                </button>
              </div>
            )}
            {saveNameError && <p className="text-destructive text-xs mt-1">{saveNameError}</p>}
            <p className="text-foreground/30 text-xs mt-1">{t("memberSince")} {memberSince}</p>
          </div>
        </div>
      </motion.div>

      {/* ── Stats Bento ── */}
      <motion.div variants={itemVariants} className="px-4 mt-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="bento-cell p-3 flex flex-col items-center justify-center text-center">
            <div className="w-8 h-8 rounded-xl bg-primary/15 flex items-center justify-center mb-2">
              <Dumbbell className="w-4 h-4 text-primary" />
            </div>
            <span className="text-lg font-bold text-foreground">{totalSessions}</span>
            <span className="text-[9px] text-foreground/30 mt-0.5">جلسه</span>
          </div>
          <div className="bento-cell p-3 flex flex-col items-center justify-center text-center">
            <div className="w-8 h-8 rounded-xl bg-warning/15 flex items-center justify-center mb-2">
              <Flame className="w-4 h-4 text-warning" />
            </div>
            <span className="text-lg font-bold text-foreground">{totalHours.toLocaleString("fa-IR")}</span>
            <span className="text-[9px] text-foreground/30 mt-0.5">ساعت</span>
          </div>
          <div className="bento-cell p-3 flex flex-col items-center justify-center text-center">
            <div className="w-8 h-8 rounded-xl bg-success/15 flex items-center justify-center mb-2">
              <TrendingUp className="w-4 h-4 text-success" />
            </div>
            <span className="text-lg font-bold text-foreground">{prCount.toLocaleString("fa-IR")}</span>
            <span className="text-[9px] text-foreground/30 mt-0.5">رکورد</span>
          </div>
        </div>
      </motion.div>

      {/* ── Wallet ── */}
      <motion.div variants={itemVariants} className="px-4 mt-4">
        <div className="glass-card overflow-hidden">
          <div className="p-4 bg-gradient-to-l from-primary/10 to-transparent">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 text-foreground/40 text-xs mb-1">
                  <Wallet className="w-3.5 h-3.5" />
                  <span>{t("walletBalance")}</span>
                </div>
                <p className="text-2xl font-bold text-foreground">{formatPrice(BigInt(walletBalance))}</p>
              </div>
              <button onClick={() => setShowTopUpModal(true)}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-primary text-foreground text-xs font-bold shadow-lg shadow-primary/25 haptic-ready"
              >
                <Plus className="w-4 h-4" />
                <span>{t("topUp")}</span>
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Feature Hub ── */}
      <motion.div variants={itemVariants} className="px-4 mt-5">
        <h3 className="text-sm font-bold text-foreground/60 mb-3">دسترسی سریع</h3>
        <div className="grid grid-cols-4 gap-2.5">
          {[
            { icon: BarChart3, label: "آمار", href: "/analytics", color: "bg-chart-purple/15", iconColor: "text-chart-purple" },
            { icon: Award, label: "رکوردها", href: "/pr", color: "bg-warning/15", iconColor: "text-warning" },
            { icon: PersonStanding, label: "نقشه بدن", href: "/body-map", color: "bg-info/15", iconColor: "text-info" },
            { icon: Ruler, label: "اندازه‌ها", href: "/body-stats", color: "bg-success/15", iconColor: "text-success" },
            { icon: Calendar, label: "تقویم", href: "/calendar", color: "bg-warning/15", iconColor: "text-warning" },
            { icon: Dumbbell, label: "حرکات", href: "/exercises", color: "bg-primary/15", iconColor: "text-primary" },
            { icon: Wrench, label: "ابزارها", href: "/tools", color: "bg-warning/15", iconColor: "text-warning" },
            { icon: TrendingUp, label: "تاریخچه", href: "/history", color: "bg-primary/15", iconColor: "text-primary" },
          ].map((item) => (
            <Link key={item.label} href={item.href}>
              <div className="bento-cell p-3 flex flex-col items-center gap-2 haptic-ready">
                <div className={`w-9 h-9 rounded-xl ${item.color} flex items-center justify-center`}>
                  <item.icon className={`w-4 h-4 ${item.iconColor}`} />
                </div>
                <span className="text-[9px] font-medium text-foreground/50 text-center leading-tight">
                  {item.label}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </motion.div>

      {/* ── My Reservations ── */}
      <motion.div variants={itemVariants} className="px-4 mt-4">
        <Link href="/bookings" className="block">
          <div className="relative overflow-hidden rounded-2xl p-4 bg-gradient-to-l from-success/15 via-success/8 to-transparent border border-success/20 haptic-ready">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-success/20 flex items-center justify-center shrink-0">
                <CalendarCheck className="w-5 h-5 text-success" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-foreground">رزروهای من</p>
                <p className="text-[10px] text-foreground/40 mt-0.5">
                  {upcomingBookingsCount > 0
                    ? `${upcomingBookingsCount.toLocaleString("fa-IR")} جلسه فعال`
                    : "مشاهده و مدیریت رزروها"
                  }
                </p>
              </div>
              {upcomingBookingsCount > 0 && (
                <div className="relative shrink-0">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-success text-[10px] font-bold text-foreground animate-pulse-subtle">
                    {upcomingBookingsCount.toLocaleString("fa-IR")}
                  </span>
                </div>
              )}
              <ChevronLeft className="w-4 h-4 text-foreground/15 shrink-0" />
            </div>
          </div>
        </Link>
      </motion.div>

      {/* ── Recent Transactions ── */}
      <motion.div variants={itemVariants} className="px-4 mt-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-foreground/60">{t("recentTransactions")}</h3>
        </div>

        {transactions.length === 0 ? (
          <div className="glass-card p-8 text-center">
            <Wallet className="w-10 h-10 text-foreground/10 mx-auto mb-3" />
            <p className="text-sm text-foreground/25">{t("noTransactions")}</p>
          </div>
        ) : (
          <div className="space-y-2 stagger-children">
            {transactions.slice(0, 5).map((tx) => {
              const display = getTransactionDisplay(tx.type);
              const TxIcon = display.icon;
              return (
                <div key={tx.id} className="glass-card p-3.5 flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl ${display.bg} flex items-center justify-center shrink-0`}>
                    <TxIcon className={`w-5 h-5 ${display.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{tx.description || display.label}</p>
                    <p className="text-[10px] text-foreground/30 mt-0.5">{formatDate(tx.created_at)}</p>
                  </div>
                  <span className={`text-sm font-bold ${display.color} shrink-0`}>
                    {tx.type === "booking_charge" ? "−" : "+"}{formatPrice(BigInt(tx.amount))}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </motion.div>

      {/* ── Settings ── */}
      <motion.div variants={itemVariants} className="px-4 mt-6">
        <h3 className="text-sm font-bold text-foreground/60 mb-3">{t("settings")}</h3>
        <div className="glass-card overflow-hidden divide-y divide-white/5">
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="w-full px-4 py-3.5 flex items-center gap-3 active:bg-white/5 transition-colors"
          >
            <div className="w-[18px] h-[18px] flex items-center justify-center">
              {theme === "dark" ? (
                <Sun className="w-[18px] h-[18px] text-warning" />
              ) : (
                <Moon className="w-[18px] h-[18px] text-primary" />
              )}
            </div>
            <span className="text-sm text-foreground/70 flex-1 text-right">
              {theme === "dark" ? "حالت روشن" : "حالت تیره"}
            </span>
            {/* iOS-style toggle */}
            <div className={`relative w-11 h-6 rounded-full transition-colors duration-300 ${
              theme === "dark" ? "bg-white/10" : "bg-primary"
            }`}>
              <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-300 ${
                theme === "dark" ? "right-0.5" : "right-[22px]"
              }`} />
            </div>
          </button>

          {settingsItems.map((item) => (
            <button
              key={item.label}
              onClick={() => {
                if (item.href) {
                  router.push(item.href)
                } else {
                  setComingSoonToast(item.label)
                  setTimeout(() => setComingSoonToast(null), 2000)
                }
              }}
              className="w-full px-4 py-3.5 flex items-center gap-3 active:bg-white/5 transition-colors"
            >
              <item.icon className={`w-[18px] h-[18px] ${item.color}`} />
              <span className="text-sm text-foreground/70 flex-1 text-right">{item.label}</span>
              <ChevronLeft className="w-4 h-4 text-foreground/15" />
            </button>
          ))}
        </div>

        {/* Logout */}
        <button onClick={handleLogout}
          className="w-full mt-3 glass-card p-4 flex items-center gap-3 active:bg-destructive/10 transition-colors border-destructive/10"
        >
          <LogOut className="w-5 h-5 text-destructive" />
          <span className="text-sm text-destructive font-medium flex-1 text-right">{t("logout")}</span>
        </button>
      </motion.div>

      {/* ── Top-Up Modal ── */}
      <AnimatePresence>
        {showTopUpModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] hevy-overlay flex items-end justify-center"
            onClick={() => { setShowTopUpModal(false); setSelectedTopUpAmount(0); setTopUpError(null); }}
          >
            <motion.div
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-t-3xl bg-background border-t border-white/10 p-6"
            >
              {/* Handle */}
              <div className="w-10 h-1 rounded-full bg-white/10 mx-auto mb-5" />

              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-foreground">{t("topUpWallet")}</h3>
                <button onClick={() => { setShowTopUpModal(false); setSelectedTopUpAmount(0); setTopUpError(null); }}
                  className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center"
                >
                  <X className="w-5 h-5 text-foreground/40" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-6">
                {TOP_UP_AMOUNTS.map((amount) => (
                  <button key={amount} onClick={() => setSelectedTopUpAmount(amount)}
                    className={`rounded-2xl p-4 border text-center transition-all haptic-ready ${
                      selectedTopUpAmount === amount
                        ? "bg-primary/15 border-primary/40 text-foreground shadow-lg shadow-primary/10"
                        : "bg-hevy-elevated border-white/5 text-foreground/50 hover:border-white/10"
                    }`}
                  >
                    <p className="text-sm font-bold">{formatPrice(BigInt(amount))}</p>
                  </button>
                ))}
              </div>

              {topUpError && <p className="text-destructive text-sm mb-4">{topUpError}</p>}

              <button onClick={handleTopUp} disabled={!selectedTopUpAmount || isToppingUp}
                className="w-full py-3.5 rounded-2xl bg-primary text-foreground font-bold disabled:opacity-40 haptic-ready shadow-lg shadow-primary/25"
              >
                {isToppingUp ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />{t("processing")}
                  </span>
                ) : t("confirmTopUp")}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Coming Soon Toast ── */}
      <AnimatePresence>
        {comingSoonToast && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-24 left-4 right-4 z-50 flex justify-center pointer-events-none"
          >
            <div className="bg-hevy-elevated border border-white/10 rounded-2xl px-5 py-3 shadow-xl shadow-black/40 flex items-center gap-2">
              <span className="text-sm text-foreground/70">🚧 {comingSoonToast} — به‌زودی</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}