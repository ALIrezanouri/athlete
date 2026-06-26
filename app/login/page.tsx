"use client"

import React, { useState, useEffect, useTransition, useCallback } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "motion/react"
import { useGlobalEngine } from "@/lib/GlobalEngineContext"
import { MagicCard } from "@/components/ui/magic-card"
import { ShinyButton } from "@/components/ui/shiny-button"
import { GlassInput } from "@/components/auth/glass-input"
import { MobileDrawerSelect } from "@/components/ui/mobile-drawer-select"
import { sendOtp, verifyOtp, getCountries } from "@/app/actions/auth"
import { Phone, ChevronRight, ChevronLeft } from "lucide-react"

// ── Types ────────────────────────────────────────────────────────────────────
type AuthStep = "phone" | "otp"

interface UserSession {
  id: string
  mobile_number: string
  role: string
  full_name: string | null
  onboarding_completed: boolean
}

interface Country {
  id: string
  name_en: string
  name_local: string
  is_rtl: boolean
}

// ── Phone Prefix Map ─────────────────────────────────────────────────────────
const PHONE_PREFIX: Record<string, string> = {
  IR: "+98",
  AE: "+971",
  US: "+1",
  TR: "+90",
}

// ── Slide Variants ───────────────────────────────────────────────────────────
const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 300 : -300,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction < 0 ? 300 : -300,
    opacity: 0,
  }),
}

// ── Login Page ───────────────────────────────────────────────────────────────
// ── Country → Locale Map ──────────────────────────────────────────────────
const COUNTRY_LOCALE_MAP: Record<string, "en" | "fa"> = {
  IR: "fa",
  AE: "fa",
  US: "en",
  TR: "en",
}

// ── Login Page ───────────────────────────────────────────────────────────────
export default function LoginPage() {
  const router = useRouter()
  const { t, dir, locale, setLocale } = useGlobalEngine()

  // State
  const [step, setStep] = useState<AuthStep>("phone")
  const [direction, setDirection] = useState(1)
  const [phone, setPhone] = useState("")
  const [otp, setOtp] = useState("")
  const [selectedCountry, setSelectedCountry] = useState<string>("IR")
  const [countries, setCountries] = useState<Country[]>([])
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [otpCooldown, setOtpCooldown] = useState(0)
  const [shakeError, setShakeError] = useState(false)

  // Transitions
  const [isSending, startSendTransition] = useTransition()
  const [isVerifying, startVerifyTransition] = useTransition()

  // Load countries
  useEffect(() => {
    getCountries().then(setCountries).catch(console.error)
  }, [])

  // ── OTP Cooldown Timer ──────────────────────────────────────────────
  useEffect(() => {
    if (otpCooldown <= 0) return
    const timer = setInterval(() => {
      setOtpCooldown((prev) => {
        if (prev <= 1) { clearInterval(timer); return 0 }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [otpCooldown])

  // ── Shake Error Trigger ─────────────────────────────────────────────
  useEffect(() => {
    if (!error) return
    setShakeError(true)
    const t = setTimeout(() => setShakeError(false), 600)
    return () => clearTimeout(t)
  }, [error])

  // Current country config
  const currentCountry = countries.find((c) => c.id === selectedCountry)
  const isRtl = currentCountry?.is_rtl ?? true

  // ── Handle Send OTP ──────────────────────────────────────────────────
  const handleSendOtp = useCallback(() => {
    setError(null)
    setSuccessMsg(null)

    const trimmed = phone.replace(/\s/g, "")
    if (!trimmed || trimmed.length < 8) {
      setError(t("login.invalid_phone"))
      return
    }

    startSendTransition(async () => {
      const result = await sendOtp(trimmed, selectedCountry)
      if (result.success) {
        setDirection(1)
        setStep("otp")
        setOtpCooldown(120)
        setSuccessMsg(result.devMode ? `DEV MODE — OTP: ${process.env.NEXT_PUBLIC_DEV_OTP_HINT ?? "check console"}` : t("login.otp_sent"))
      } else {
        setError(result.error ?? t("login.invalid_phone"))
      }
    })
  }, [phone, selectedCountry, t])

  // ── Handle Verify OTP ────────────────────────────────────────────────
  const handleVerifyOtp = useCallback(() => {
    setError(null)
    setSuccessMsg(null)

    if (!otp || otp.length !== 6) {
      setError(t("login.invalid_otp"))
      return
    }

    const trimmedPhone = phone.replace(/\s/g, "")

    startVerifyTransition(async () => {
      const result = await verifyOtp(trimmedPhone, otp, selectedCountry)
      if (result.success) {
        const session: UserSession = {
          id: result.profile!.id,
          mobile_number: result.profile!.mobile_number,
          role: result.profile!.role,
          full_name: result.profile!.full_name,
          onboarding_completed: result.profile!.onboarding_completed,
        }
        console.log("[LOGIN] ✅ Session established:", session)
        // Hard navigation to avoid middleware race condition —
        // router.push() can trigger middleware before the session cookie is visible.
        window.location.href = result.profile!.onboarding_completed ? "/home" : "/onboarding"
      } else {
        setError(result.error ?? t("login.invalid_otp"))
      }
    })
  }, [phone, otp, selectedCountry, t])

  // ── Handle Resend ────────────────────────────────────────────────────
  const handleResend = useCallback(() => {
    setError(null)
    const trimmed = phone.replace(/\s/g, "")
    startSendTransition(async () => {
      const result = await sendOtp(trimmed, selectedCountry)
      if (result.success) {
        setOtpCooldown(120)
        setSuccessMsg(result.devMode ? `DEV MODE — OTP: check console` : t("login.otp_sent"))
      }
    })
  }, [phone, selectedCountry])

  // ── Back to Phone Step ───────────────────────────────────────────────
  const handleBack = useCallback(() => {
    setDirection(-1)
    setStep("phone")
    setOtp("")
    setError(null)
    setSuccessMsg(null)
  }, [])

  return (
    <div
      className="flex min-h-screen items-center justify-center bg-black px-4"
      dir={dir}
    >
      <div className="w-full max-w-sm">
        <MagicCard
          className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-[10px]"
          gradientSize={200}
          gradientColor="#3A86FF"
          gradientOpacity={0.08}
        >
          {/* ── Header ──────────────────────────────────────────────── */}
          <div className="mb-6 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
              <Phone className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-xl font-bold text-foreground">
              {t("login.title")}
            </h1>
            <p className="mt-1 text-sm text-foreground/40">
              {t("login.subtitle")}
            </p>
          </div>

          {/* ── Animated Steps ──────────────────────────────────────── */}
          <div className="relative overflow-hidden">
            <AnimatePresence mode="wait" custom={direction}>
              {step === "phone" ? (
                <motion.div
                  key="phone"
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  className="flex flex-col gap-4"
                  suppressHydrationWarning
                >
                  {/* Country Selector */}
                  <MobileDrawerSelect
                    value={selectedCountry}
                    onChange={(country) => {
                      setSelectedCountry(country)
                      const mappedLocale = COUNTRY_LOCALE_MAP[country] ?? "fa"
                      if (mappedLocale !== locale) setLocale(mappedLocale)
                    }}
                    options={countries.map((c) => ({
                      value: c.id,
                      label: `${locale === "fa" ? c.name_local : c.name_en} (${PHONE_PREFIX[c.id]})`,
                    }))}
                    drawerTitle={t("login.title")}
                    dir="ltr"
                    className="!rounded-xl !bg-white/[0.05] !backdrop-blur-[10px]"
                  />

                  {/* Phone Input with Prefix */}
                  <div className="flex gap-2">
                    <div className="flex shrink-0 items-center rounded-xl border border-white/10 bg-white/[0.05] px-3 text-sm text-foreground/60 backdrop-blur-[10px]">
                      {PHONE_PREFIX[selectedCountry]}
                    </div>
                    <GlassInput
                      value={phone}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^\d]/g, "")
                        setPhone(val)
                      }}
                      placeholder={t("login.phone_placeholder")}
                      dir="ltr"
                      maxLength={15}
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSendOtp()
                      }}
                      className="flex-1"
                    />
                  </div>

                  {/* Send Button */}
                  <ShinyButton
                    onClick={handleSendOtp}
                    disabled={isSending || !phone}
                    className="mt-2 w-full border-primary/30 py-3"
                  >
                    {isSending ? t("login.sending") : t("login.button_send")}
                  </ShinyButton>
                </motion.div>
              ) : (
                <motion.div
                  key="otp"
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  className="flex flex-col gap-4"
                  suppressHydrationWarning
                >
                  {/* Back Button */}
                  <button
                    onClick={handleBack}
                    className="flex items-center gap-1 text-xs text-foreground/40 transition-colors hover:text-foreground/60"
                  >
                    {isRtl ? (
                      <ChevronRight className="h-3 w-3" />
                    ) : (
                      <ChevronLeft className="h-3 w-3" />
                    )}
                    {t("login.back")}
                  </button>

                  {/* Phone Display */}
                  <div className="rounded-xl bg-white/[0.03] px-4 py-2 text-center text-sm text-foreground/50">
                    {PHONE_PREFIX[selectedCountry]} {phone}
                  </div>

                  {/* OTP Input */}
                  <GlassInput
                    value={otp}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^\d]/g, "")
                      setOtp(val)
                    }}
                    placeholder={t("login.otp_placeholder")}
                    dir="ltr"
                    maxLength={6}
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleVerifyOtp()
                    }}
                  />

                  {/* Verify Button */}
                  <ShinyButton
                    onClick={handleVerifyOtp}
                    disabled={isVerifying || otp.length !== 6}
                    className="w-full border-success/30 py-3"
                  >
                    {isVerifying
                      ? t("login.verifying")
                      : t("login.button_verify")}
                  </ShinyButton>

                  {/* Resend / Countdown */}
                  <div className="text-center">
                    {otpCooldown > 0 ? (
                      <span className="text-xs text-foreground/25">
                        ارسال مجدد ({otpCooldown})
                      </span>
                    ) : (
                      <button
                        onClick={handleResend}
                        disabled={isSending}
                        className="text-xs text-primary/70 transition-colors hover:text-primary disabled:opacity-50"
                      >
                        {isSending ? "..." : t("login.button_resend")}
                      </button>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ── Messages ────────────────────────────────────────────── */}
          <AnimatePresence>
            {error && (
              <motion.div
                key={error}
                initial={{ opacity: 0, y: 5 }}
                animate={
                  shakeError
                    ? { opacity: 1, y: 0, x: [0, -8, 8, -6, 6, -3, 3, 0] }
                    : { opacity: 1, y: 0, x: 0 }
                }
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
                className="mt-4 rounded-lg bg-red-500/10 px-3 py-2 text-center text-xs text-red-400"
              >
                {error}
              </motion.div>
            )}
            {successMsg && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mt-4 rounded-lg bg-success/10 px-3 py-2 text-center text-xs text-success"
              >
                {successMsg}
              </motion.div>
            )}
          </AnimatePresence>
        </MagicCard>
      </div>
    </div>
  )
}