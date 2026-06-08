"use client"

import {
  Dumbbell,
  Footprints,
  Flame,
  Crown,
  Play,
  MapPin,
  Clock,
  Star,
  Bell,
  Trophy,
  Users,
  ChevronRight,
  Search,
  Mail,
  Lock,
  Zap,
  Activity,
  Heart,
  type LucideIcon,
} from "lucide-react"

import { BentoGrid, BentoCard } from "@/components/ui/bento-grid"
import { BorderBeam } from "@/components/ui/border-beam"
import { ShinyButton } from "@/components/ui/shiny-button"
import { MagicCard } from "@/components/ui/magic-card"
import { Marquee } from "@/components/ui/marquee"
import { AnimatedList } from "@/components/ui/animated-list"

// Localization — Persian (fa) translation map
// Replace with i18n engine integration when available
const translations: Record<string, string> = {
  "Gym Global Athlete": "جیم گلوبال athlete",
  "Design System": "سیستم طراحی",
  "Atomic component library — Hevy + Glassmorphism aesthetic. Pure black canvas with glass surfaces, electric blue accents, and spring green metrics.":
    "کتابخانه اتمی کامپوننت‌ها — زیبایی‌شناسی Hevy + Glassmorphism. بوم مشکی خالص با سطوح شیشه‌ای، لهجه‌های آبی الکتریک و معیارهای سبز بهاری.",
  "Color Tokens": "رنگ‌های پایه",
  "Core palette for the design system": "پالت اصلی سیستم طراحی",
  "Bento Grid — Workout Metrics": "بنتو گرید — معیارهای تمرین",
  "Glassmorphism cards for real-time activity tracking":
    "کارت‌های گلاسمورفیسم برای ردیابی لحظه‌ای فعالیت",
  "Active Workout": "تمرین فعال",
  "Current session in progress": "جلسه فعلی در حال انجام",
  "sets completed": "ست تکمیل شده",
  "Steps": "قدم‌ها",
  "Daily step counter": "شمارنده قدم روزانه",
  "steps today": "قدم امروز",
  "Calories": "کالری",
  "Burned this session": "سوزانده شده این جلسه",
  "kcal burned": "کیلوکالری سوزانده شده",
  "Border Beam — Premium Card": "حاشیه نوری — کارت اشتراک ویژه",
  "Animated beam highlight for premium subscription upsell":
    "نور متحرک حاشیه برای ارتقای اشتراک ویژه",
  "Go Premium": "اشتراک ویژه",
  "Unlock AI coaching, advanced analytics & more":
    "مربی‌گری هوش مصنوعی، تحلیل پیشرفته و بیشتر",
  "$9.99": "۳۹۹,۰۰۰",
  "/month": "/ماه",
  "Subscribe": "خرید اشتراک",
  "Shiny Button — Primary Action": "دکمه درخشان — عمل اصلی",
  "Animated primary CTA with shimmer effect for workout initiation":
    "دکمه فراخوان اصلی متحرک با افکت درخشش برای شروع تمرین",
  "Start Workout": "شروع تمرین",
  "Quick Start": "شروع سریع",
  "Custom Plan": "برنامه سفارشی",
  "Magic Card — Gym Booking": "کارت جادویی — رزرو باشگاه",
  "Spotlight effect cards for gym session booking with hover interaction":
    "کارت‌های افکت نور spot برای رزرو جلسه باشگاه با تعامل hover",
  "Popular": "محبوب",
  "CrossFit Session": "جلسه کراسفیت",
  "High-intensity functional training": "تمرین عملکردی با شدت بالا",
  "Zone A": "سالن A",
  "6:00 AM": "۶:۰۰ صبح",
  "Free": "رایگان",
  "Premium": "ویژه",
  "Personal Training": "مربی‌گری شخصی",
  "1-on-1 coaching with certified trainer": "مربی‌گری اختصاصی با مربی تأیید شده",
  "1 spot left": "۱ جایگاه باقی‌مانده",
  "8:00 AM": "۸:۰۰ صبح",
  "$25": "۹۹۰,۰۰۰",
  "New": "جدید",
  "Yoga Flow": "یوگا فلو",
  "Mindfulness & flexibility session": "جلسه ذهن‌آگاهی و انعطاف‌پذیری",
  "8 spots": "۸ جایگاه",
  "5:00 PM": "۵:۰۰ عصر",
  "$12": "۴۷۰,۰۰۰",
  "Marquee — Partner Brands": "مارکی — برندهای همکار",
  "Infinite scroll banner showcasing sport brand partnerships":
    "بنر اسکرول بی‌نهایت نمایش همکاری با برندهای ورزشی",
  "Animated List — Training Notifications": "لیست متحرک — اعلان‌های تمرین",
  "Real-time animated notifications for training events":
    "اعلان‌های متحرک لحظه‌ای برای رویدادهای تمرینی",
  "New PR!": "رکورد جدید!",
  "You just beat your deadlift record — 180kg":
    "رکوردددلیفت شما شکسته شد — ۱۸۰ کیلو",
  "just now": "همین الان",
  "Streak Milestone": "نقطه عطف استریک",
  "7-day workout streak achieved!": "استریک ۷ روزه تمرین انجام شد!",
  "2m ago": "۲ دقیقه پیش",
  "Recovery Ready": "آماده تمرین",
  "Your HRV indicates full recovery. Go train!":
    "HRV شما نشان‌دهنده ریکاوری کامل است. تمرین کنید!",
  "15m ago": "۱۵ دقیقه پیش",
  "Heart Rate Zone": "منطقه ضربان قلب",
  "You spent 45min in Zone 3 today": "امروز ۴۵ دقیقه در Zone 3 بودید",
  "1h ago": "۱ ساعت پیش",
  "Class Reminder": "یادآوری کلاس",
  "CrossFit starts in 30 minutes": "کراسفیت ۳۰ دقیقه دیگر شروع می‌شود",
  "Interactive Elements": "عناصر تعاملی",
  "Haptic-ready inputs and buttons with glassmorphism styling":
    "ورودی‌ها و دکمه‌های آماده haptic با استایل گلاسمورفیسم",
  "Input Fields": "فیلدهای ورودی",
  "Search workouts...": "جستجوی تمرین‌ها...",
  "Email address": "آدرس ایمیل",
  "Password": "رمز عبور",
  "Disabled input": "ورودی غیرفعال",
  "Button States": "وضعیت‌های دکمه",
  "Primary Action": "عمل اصلی",
  "Secondary Action": "عمل ثانویه",
  "Success Action": "عمل موفقیت",
  "Ghost Action": "عمل شفاف",
  "Disabled Action": "عمل غیرفعال",
  "Gym Global Athlete PWA — Design System v1.0":
    "جیم گلوبال athlete PWA — سیستم طراحی نسخه ۱.۰",
  "Hevy + Glassmorphism": "Hevy + Glassmorphism",
}

const t = (key: string): string => translations[key] ?? key

// ─── Section Wrapper ──────────────────────────────────────────────
function Section({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        <p className="text-sm text-foreground/40">{description}</p>
      </div>
      {children}
    </section>
  )
}

// ─── Brand Logo Placeholder ───────────────────────────────────────
function BrandLogo({ name }: { name: string }) {
  return (
    <div className="glass flex h-12 w-24 items-center justify-center rounded-lg">
      <span className="text-xs font-medium text-foreground/60">{name}</span>
    </div>
  )
}

// ─── Notification Item ────────────────────────────────────────────
function NotificationItem({
  icon: Icon,
  title,
  description,
  time,
  accent = "#3A86FF",
}: {
  icon: LucideIcon
  title: string
  description: string
  time: string
  accent?: string
}) {
  return (
    <div className="glass flex w-full items-start gap-3 rounded-xl p-4">
      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
        style={{ backgroundColor: `${accent}15` }}
      >
        <Icon className="h-4 w-4" style={{ color: accent }} />
      </div>
      <div className="flex flex-1 flex-col gap-0.5">
        <span className="text-sm font-medium text-foreground">{title}</span>
        <span className="text-xs text-foreground/40">{description}</span>
      </div>
      <span className="shrink-0 text-[10px] text-foreground/25">{time}</span>
    </div>
  )
}

// ─── Design System Page ───────────────────────────────────────────
export default function DesignSystemPage() {
  return (
    <div className="min-h-screen bg-black px-4 pb-12 pt-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        {/* ── Header ────────────────────────────────────── */}
        <header className="mb-12 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <Dumbbell className="h-4 w-4 text-primary" />
            </div>
            <span className="text-sm font-medium text-primary">
              {t("Gym Global Athlete")}
            </span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            {t("Design System")}
          </h1>
          <p className="max-w-xl text-sm text-foreground/40">
            {t(
              "Atomic component library — Hevy + Glassmorphism aesthetic. Pure black canvas with glass surfaces, electric blue accents, and spring green metrics."
            )}
          </p>
        </header>

        {/* ── Color Tokens ──────────────────────────────── */}
        <Section
          title={t("Color Tokens")}
          description={t("Core palette for the design system")}
        >
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { name: "Background", value: "#000000", color: "#000000" },
              { name: "Primary", value: "#3A86FF", color: "#3A86FF" },
              { name: "Success", value: "#00E676", color: "#00E676" },
              { name: "Glass BG", value: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.05)" },
              { name: "Glass Border", value: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.1)" },
              { name: "Text Primary", value: "#FFFFFF", color: "#FFFFFF" },
              { name: "Text Muted", value: "rgba(255,255,255,0.4)", color: "rgba(255,255,255,0.4)" },
              { name: "Surface Hover", value: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.08)" },
            ].map((token) => (
              <div
                key={token.name}
                className="glass flex flex-col gap-2 rounded-xl p-4"
              >
                <div
                  className="h-10 rounded-lg border border-[rgba(255,255,255,0.1)]"
                  style={{ backgroundColor: token.color }}
                />
                <span className="text-xs font-medium text-foreground">
                  {token.name}
                </span>
                <span className="font-mono text-[10px] text-foreground/30">
                  {token.value}
                </span>
              </div>
            ))}
          </div>
        </Section>

        {/* ── Bento Grid: Workout Metrics ───────────────── */}
        <div className="mt-12">
          <Section
            title={t("Bento Grid — Workout Metrics")}
            description={t(
              "Glassmorphism cards for real-time activity tracking"
            )}
          >
            <BentoGrid>
              <BentoCard
                name={t("Active Workout")}
                description={t("Current session in progress")}
                Icon={Dumbbell}
                metric={t("12")}
                metricLabel={t("sets completed")}
              >
                <div className="mb-3 flex items-center gap-2">
                  <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/5">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: "68%" }}
                    />
                  </div>
                  <span className="text-[10px] text-primary">68%</span>
                </div>
              </BentoCard>

              <BentoCard
                name={t("Steps")}
                description={t("Daily step counter")}
                Icon={Footprints}
                metric={t("8,432")}
                metricLabel={t("steps today")}
              >
                <div className="mb-3 flex items-center gap-2">
                  <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/5">
                    <div
                      className="h-full rounded-full bg-success"
                      style={{ width: "84%" }}
                    />
                  </div>
                  <span className="text-[10px] text-success">84%</span>
                </div>
              </BentoCard>

              <BentoCard
                name={t("Calories")}
                description={t("Burned this session")}
                Icon={Flame}
                metric={t("542")}
                metricLabel={t("kcal burned")}
              >
                <div className="mb-3 flex items-center gap-2">
                  <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/5">
                    <div
                      className="h-full rounded-full bg-warning"
                      style={{ width: "54%" }}
                    />
                  </div>
                  <span className="text-[10px] text-warning">54%</span>
                </div>
              </BentoCard>
            </BentoGrid>
          </Section>
        </div>

        {/* ── Border Beam: Premium Card ─────────────────── */}
        <div className="mt-12">
          <Section
            title={t("Border Beam — Premium Card")}
            description={t(
              "Animated beam highlight for premium subscription upsell"
            )}
          >
            <div className="glass relative overflow-hidden rounded-2xl p-6 sm:p-8">
              <BorderBeam
                size={80}
                duration={4}
                colorFrom="#3A86FF"
                colorTo="#00E676"
                borderWidth={2}
              />
              <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                    <Crown className="h-7 w-7 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-foreground">
                      {t("Go Premium")}
                    </h3>
                    <p className="text-sm text-foreground/40">
                      {t("Unlock AI coaching, advanced analytics & more")}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex flex-col items-end">
                    <span className="text-2xl font-bold text-foreground">
                      {t("$9.99")}
                    </span>
                    <span className="text-xs text-foreground/30">
                      {t("/month")}
                    </span>
                  </div>
                  <button className="haptic-ready flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-primary/80">
                    {t("Subscribe")}
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </Section>
        </div>

        {/* ── Shiny Button: Start Workout ───────────────── */}
        <div className="mt-12">
          <Section
            title={t("Shiny Button — Primary Action")}
            description={t(
              "Animated primary CTA with shimmer effect for workout initiation"
            )}
          >
            <div className="glass flex flex-col items-center gap-6 rounded-2xl p-8">
              <ShinyButton
                className="border-primary/30 bg-primary/10 px-10 py-4 text-lg"
              >
                <span className="flex items-center gap-2">
                  <Play className="h-5 w-5" />
                  {t("Start Workout")}
                </span>
              </ShinyButton>
              <div className="flex gap-3">
                <ShinyButton className="border-white/10 bg-white/5 px-5 py-2 text-sm">
                  {t("Quick Start")}
                </ShinyButton>
                <ShinyButton className="border-white/10 bg-white/5 px-5 py-2 text-sm">
                  {t("Custom Plan")}
                </ShinyButton>
              </div>
            </div>
          </Section>
        </div>

        {/* ── Magic Card: Gym Booking ───────────────────── */}
        <div className="mt-12">
          <Section
            title={t("Magic Card — Gym Booking")}
            description={t(
              "Spotlight effect cards for gym session booking with hover interaction"
            )}
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <MagicCard
                className="flex flex-col justify-between p-6"
                gradientSize={300}
                gradientFrom="#3A86FF"
                gradientTo="#00E676"
              >
                <div>
                  <div className="mb-4 flex items-center justify-between">
                    <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                      {t("Popular")}
                    </span>
                    <div className="flex items-center gap-1">
                      <Star className="h-3 w-3 fill-warning text-warning" />
                      <span className="text-xs text-foreground/50">4.9</span>
                    </div>
                  </div>
                  <h3 className="text-lg font-bold text-foreground">
                    {t("CrossFit Session")}
                  </h3>
                  <p className="mt-1 text-xs text-foreground/40">
                    {t("High-intensity functional training")}
                  </p>
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-foreground/30">
                    <MapPin className="h-3 w-3" />
                    {t("Zone A")}
                    <Clock className="ml-2 h-3 w-3" />
                    {t("6:00 AM")}
                  </div>
                  <span className="text-sm font-bold text-success">
                    {t("Free")}
                  </span>
                </div>
              </MagicCard>

              <MagicCard
                className="flex flex-col justify-between p-6"
                gradientSize={300}
                gradientFrom="#9C40FF"
                gradientTo="#3A86FF"
              >
                <div>
                  <div className="mb-4 flex items-center justify-between">
                    <span className="rounded-full bg-chart-purple/10 px-3 py-1 text-xs font-medium text-chart-purple">
                      {t("Premium")}
                    </span>
                    <div className="flex items-center gap-1">
                      <Star className="h-3 w-3 fill-warning text-warning" />
                      <span className="text-xs text-foreground/50">4.8</span>
                    </div>
                  </div>
                  <h3 className="text-lg font-bold text-foreground">
                    {t("Personal Training")}
                  </h3>
                  <p className="mt-1 text-xs text-foreground/40">
                    {t("1-on-1 coaching with certified trainer")}
                  </p>
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-foreground/30">
                    <Users className="h-3 w-3" />
                    {t("1 spot left")}
                    <Clock className="ml-2 h-3 w-3" />
                    {t("8:00 AM")}
                  </div>
                  <span className="text-sm font-bold text-success">
                    {t("$25")}
                  </span>
                </div>
              </MagicCard>

              <MagicCard
                className="flex flex-col justify-between p-6"
                gradientSize={300}
                gradientFrom="#00E676"
                gradientTo="#3A86FF"
              >
                <div>
                  <div className="mb-4 flex items-center justify-between">
                    <span className="rounded-full bg-success/10 px-3 py-1 text-xs font-medium text-success">
                      {t("New")}
                    </span>
                    <div className="flex items-center gap-1">
                      <Star className="h-3 w-3 fill-warning text-warning" />
                      <span className="text-xs text-foreground/50">4.7</span>
                    </div>
                  </div>
                  <h3 className="text-lg font-bold text-foreground">
                    {t("Yoga Flow")}
                  </h3>
                  <p className="mt-1 text-xs text-foreground/40">
                    {t("Mindfulness & flexibility session")}
                  </p>
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-foreground/30">
                    <Users className="h-3 w-3" />
                    {t("8 spots")}
                    <Clock className="ml-2 h-3 w-3" />
                    {t("5:00 PM")}
                  </div>
                  <span className="text-sm font-bold text-success">
                    {t("$12")}
                  </span>
                </div>
              </MagicCard>
            </div>
          </Section>
        </div>

        {/* ── Marquee: Partner Brands ───────────────────── */}
        <div className="mt-12">
          <Section
            title={t("Marquee — Partner Brands")}
            description={t(
              "Infinite scroll banner showcasing sport brand partnerships"
            )}
          >
            <div className="glass overflow-hidden rounded-2xl py-2">
              <Marquee pauseOnHover className="[--duration:30s]">
                {[
                  "Nike",
                  "Adidas",
                  "Under Armour",
                  "Puma",
                  "Reebok",
                  "Gymshark",
                  "Lululemon",
                  "CrossFit",
                ].map((brand) => (
                  <BrandLogo key={brand} name={brand} />
                ))}
              </Marquee>
              <Marquee reverse pauseOnHover className="[--duration:30s]">
                {[
                  "MyProtein",
                  "Optimum Nutrition",
                  "Fitbit",
                  "Garmin",
                  "WHOOP",
                  "Hyperice",
                  "Therabody",
                  "Peloton",
                ].map((brand) => (
                  <BrandLogo key={brand} name={brand} />
                ))}
              </Marquee>
            </div>
          </Section>
        </div>

        {/* ── Animated List: Notifications ──────────────── */}
        <div className="mt-12">
          <Section
            title={t("Animated List — Training Notifications")}
            description={t(
              "Real-time animated notifications for training events"
            )}
          >
            <div className="glass max-w-md rounded-2xl p-4">
              <AnimatedList delay={2000}>
                <NotificationItem
                  icon={Trophy}
                  title={t("New PR!")}
                  description={t("You just beat your deadlift record — 180kg")}
                  time={t("just now")}
                  accent="#FFD700"
                />
                <NotificationItem
                  icon={Zap}
                  title={t("Streak Milestone")}
                  description={t("7-day workout streak achieved!")}
                  time={t("2m ago")}
                  accent="#3A86FF"
                />
                <NotificationItem
                  icon={Activity}
                  title={t("Recovery Ready")}
                  description={t("Your HRV indicates full recovery. Go train!")}
                  time={t("15m ago")}
                  accent="#00E676"
                />
                <NotificationItem
                  icon={Heart}
                  title={t("Heart Rate Zone")}
                  description={t("You spent 45min in Zone 3 today")}
                  time={t("1h ago")}
                  accent="#FF6B35"
                />
                <NotificationItem
                  icon={Bell}
                  title={t("Class Reminder")}
                  description={t("CrossFit starts in 30 minutes")}
                  time={t("1h ago")}
                  accent="#9C40FF"
                />
              </AnimatedList>
            </div>
          </Section>
        </div>

        {/* ── Interactive Elements ──────────────────────── */}
        <div className="mt-12">
          <Section
            title={t("Interactive Elements")}
            description={t(
              "Haptic-ready inputs and buttons with glassmorphism styling"
            )}
          >
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {/* Inputs */}
              <div className="glass flex flex-col gap-4 rounded-2xl p-6">
                <h3 className="text-sm font-semibold text-foreground">
                  {t("Input Fields")}
                </h3>
                {/* Search Input */}
                <div className="flex items-center gap-2 rounded-xl bg-white/5 px-4 py-3 ring-1 ring-white/10 transition-all focus-within:ring-primary/50">
                  <Search className="h-4 w-4 text-foreground/30" />
                  <input
                    type="text"
                    placeholder={t("Search workouts...")}
                    className="flex-1 bg-transparent text-sm text-foreground placeholder:text-foreground/25 focus:outline-none"
                  />
                </div>
                {/* Email Input */}
                <div className="flex items-center gap-2 rounded-xl bg-white/5 px-4 py-3 ring-1 ring-white/10 transition-all focus-within:ring-primary/50">
                  <Mail className="h-4 w-4 text-foreground/30" />
                  <input
                    type="email"
                    placeholder={t("Email address")}
                    className="flex-1 bg-transparent text-sm text-foreground placeholder:text-foreground/25 focus:outline-none"
                  />
                </div>
                {/* Password Input */}
                <div className="flex items-center gap-2 rounded-xl bg-white/5 px-4 py-3 ring-1 ring-white/10 transition-all focus-within:ring-primary/50">
                  <Lock className="h-4 w-4 text-foreground/30" />
                  <input
                    type="password"
                    placeholder={t("Password")}
                    className="flex-1 bg-transparent text-sm text-foreground placeholder:text-foreground/25 focus:outline-none"
                  />
                </div>
                {/* Disabled Input */}
                <div className="flex items-center gap-2 rounded-xl bg-white/[0.02] px-4 py-3 ring-1 ring-white/5">
                  <Dumbbell className="h-4 w-4 text-foreground/15" />
                  <input
                    type="text"
                    disabled
                    placeholder={t("Disabled input")}
                    className="flex-1 bg-transparent text-sm text-foreground/15 placeholder:text-foreground/15"
                  />
                </div>
              </div>

              {/* Buttons */}
              <div className="glass flex flex-col gap-4 rounded-2xl p-6">
                <h3 className="text-sm font-semibold text-foreground">
                  {t("Button States")}
                </h3>
                {/* Primary Button */}
                <button className="haptic-ready flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-foreground transition-all hover:bg-primary/80 active:scale-[0.97]">
                  <Play className="h-4 w-4" />
                  {t("Primary Action")}
                </button>
                {/* Secondary Button */}
                <button className="haptic-ready flex items-center justify-center gap-2 rounded-xl bg-white/5 px-6 py-3 text-sm font-medium text-foreground ring-1 ring-white/10 transition-all hover:bg-white/10 active:scale-[0.97]">
                  {t("Secondary Action")}
                </button>
                {/* Success Button */}
                <button className="haptic-ready flex items-center justify-center gap-2 rounded-xl bg-success/10 px-6 py-3 text-sm font-medium text-success ring-1 ring-success/20 transition-all hover:bg-success/20 active:scale-[0.97]">
                  <Trophy className="h-4 w-4" />
                  {t("Success Action")}
                </button>
                {/* Ghost Button */}
                <button className="haptic-ready flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-medium text-foreground/50 transition-all hover:text-foreground active:scale-[0.97]">
                  {t("Ghost Action")}
                  <ChevronRight className="h-4 w-4" />
                </button>
                {/* Disabled Button */}
                <button
                  disabled
                  className="flex items-center justify-center gap-2 rounded-xl bg-white/5 px-6 py-3 text-sm font-medium text-foreground/20"
                >
                  {t("Disabled Action")}
                </button>
              </div>
            </div>
          </Section>
        </div>

        {/* ── Footer ─────────────────────────────────────── */}
        <footer className="mt-16 flex items-center justify-between border-t border-white/5 pt-6">
          <span className="text-xs text-foreground/20">
            {t("Gym Global Athlete PWA — Design System v1.0")}
          </span>
          <span className="text-xs text-foreground/20">
            {t("Hevy + Glassmorphism")}
          </span>
        </footer>
      </div>
    </div>
  )
}