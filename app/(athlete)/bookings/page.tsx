"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Calendar,
  CalendarPlus,
  Clock,
  MapPin,
  Star,
  X,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  MessageSquare,
  Dumbbell,
  RotateCcw,
  Ticket,
  QrCode,
} from "lucide-react";
import dynamic from "next/dynamic";

/* ─── Dynamic QR Code (heavy library, client-only) ─── */
const QRCodeSVG = dynamic(
  () => import("qrcode.react").then((mod) => mod.QRCodeSVG),
  {
    ssr: false,
    loading: () => <div className="animate-pulse bg-gray-200 rounded-lg h-[200px] w-[200px] mx-auto" />,
  }
);
import { useRouter } from "next/navigation";
import { useGlobalEngine } from "@/lib/GlobalEngineContext";
import { getBookings, cancelBooking, rateBooking } from "@/app/actions/bookings";

/* ─── Types ─── */
type BookingStatus = "upcoming" | "active" | "completed" | "cancelled" | "expired";

interface Booking {
  id: string;
  gymId: string;
  gymName: string;
  gymImage: string;
  sportType: string;
  date: string;
  time: string;
  price: number;
  status: BookingStatus;
  address: string;
  rated: boolean;
  rating?: number;
  comment?: string;
  checkInCode: string | null;
}

/* ─── Sport Icon Map ─── */
function getSportIcon(sport: string) {
  switch (sport) {
    case "bodybuilding":
      return Dumbbell;
    case "boxing":
      return "🥊" as unknown as React.ComponentType<{ className?: string }>;
    case "swimming":
      return "🏊" as unknown as React.ComponentType<{ className?: string }>;
    case "crossfit":
      return "🏋️" as unknown as React.ComponentType<{ className?: string }>;
    case "yoga":
      return "🧘" as unknown as React.ComponentType<{ className?: string }>;
    default:
      return Dumbbell;
  }
}

/* ─── Status Badge ─── */
function StatusBadge({ status }: { status: BookingStatus }) {
  const { t } = useGlobalEngine();

  const config: Record<string, { bg: string; text: string; icon: React.ComponentType<{ className?: string }>; label: string }> = {
    upcoming: {
      bg: "bg-blue-500/20",
      text: "text-blue-400",
      icon: Clock,
      label: t("bookings.upcomingLabel"),
    },
    active: {
      bg: "bg-green-500/20",
      text: "text-green-400",
      icon: CheckCircle2,
      label: t("bookings.activeLabel"),
    },
    completed: {
      bg: "bg-green-500/20",
      text: "text-green-400",
      icon: CheckCircle2,
      label: t("bookings.completedLabel"),
    },
    cancelled: {
      bg: "bg-red-500/20",
      text: "text-red-400",
      icon: XCircle,
      label: t("bookings.cancelledLabel"),
    },
    expired: {
      bg: "bg-amber-500/20",
      text: "text-amber-400",
      icon: AlertTriangle,
      label: t("bookings.expiredLabel"),
    },
  };

  const c = config[status] || config.upcoming;
  const Icon = c.icon;

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${c.bg} ${c.text}`}
    >
      <Icon className="w-3 h-3" />
      {c.label}
    </span>
  );
}

/* ─── Tab Key Type (only the 4 visible tabs) ─── */
type TabKey = "upcoming" | "active" | "completed" | "cancelled";

/* ─── Main Page ─── */
export default function BookingsPage() {
  const { t, formatPrice, isFeatureEnabled } = useGlobalEngine();
  const router = useRouter();

  const ticketEnabled = isFeatureEnabled("booking_ticket");

  /* Active tab */
  const [activeTab, setActiveTab] = useState<TabKey>("upcoming");

  /* Loading and error states */
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /* Cancel modal */
  const [cancelTarget, setCancelTarget] = useState<Booking | null>(null);
  const [cancelProcessing, setCancelProcessing] = useState(false);
  const [cancelDone, setCancelDone] = useState(false);

  /* Rate modal */
  const [rateTarget, setRateTarget] = useState<Booking | null>(null);
  const [rateStars, setRateStars] = useState(0);
  const [rateHover, setRateHover] = useState(0);
  const [rateComment, setRateComment] = useState("");
  const [rateDone, setRateDone] = useState(false);

  /* Ticket overlay */
  const [ticketTarget, setTicketTarget] = useState<Booking | null>(null);

  /* Local booking state */
  const [bookings, setBookings] = useState<Booking[]>([]);

  /* Fetch ALL bookings on mount (no tab-based re-fetch) */
  useEffect(() => {
    async function fetchBookings() {
      setLoading(true);
      setError(null);

      try {
        const result = await getBookings();

        if (result.success && result.bookings) {
          setBookings(
            result.bookings.map((b) => ({
              id: b.id,
              gymId: b.gym_id,
              gymName: b.gym_name,
              gymImage: b.gym_image_url || "",
              sportType: b.sport_type || "bodybuilding",
              date: b.booking_date,
              time: b.time_slot,
              price: b.price,
              status: b.status as BookingStatus,
              address: b.address,
              rated: b.rated,
              rating: b.rating ?? undefined,
              comment: b.comment ?? undefined,
              checkInCode: b.check_in_code,
            }))
          );
        } else {
          setError(result.error || "Failed to load bookings");
        }
      } catch {
        setError("Unexpected error loading bookings");
      }

      setLoading(false);
    }

    fetchBookings();
  }, []);

  /* Filtered list — completed tab includes expired bookings */
  const filtered = useMemo(() => {
    if (activeTab === "completed") {
      return bookings.filter(
        (b) => b.status === "completed" || b.status === "expired"
      );
    }
    return bookings.filter((b) => b.status === activeTab);
  }, [bookings, activeTab]);

  /* Tab counts */
  const counts = useMemo(
    () => ({
      upcoming: bookings.filter((b) => b.status === "upcoming").length,
      active: bookings.filter((b) => b.status === "active").length,
      completed: bookings.filter((b) => b.status === "completed" || b.status === "expired").length,
      cancelled: bookings.filter((b) => b.status === "cancelled").length,
    }),
    [bookings]
  );

  /* ─── Cancel handler ─── */
  async function handleCancel() {
    if (!cancelTarget) return;
    setCancelProcessing(true);

    const result = await cancelBooking(cancelTarget.id);

    if (result.success) {
      setBookings((prev) =>
        prev.map((b) =>
          b.id === cancelTarget.id ? { ...b, status: "cancelled" as BookingStatus } : b
        )
      );
      setCancelProcessing(false);
      setCancelDone(true);
      setTimeout(() => {
        setCancelTarget(null);
        setCancelDone(false);
      }, 1200);
    } else {
      setError(result.error || "Failed to cancel booking");
      setCancelProcessing(false);
    }
  }

  /* ─── Rate handler ─── */
  async function handleSubmitRate() {
    if (!rateTarget || rateStars === 0) return;

    const result = await rateBooking(rateTarget.id, rateStars, rateComment || undefined);

    if (result.success) {
      setBookings((prev) =>
        prev.map((b) =>
          b.id === rateTarget.id
            ? { ...b, rated: true, rating: rateStars, comment: rateComment }
            : b
        )
      );
      setRateDone(true);
      setTimeout(() => {
        setRateTarget(null);
        setRateStars(0);
        setRateHover(0);
        setRateComment("");
        setRateDone(false);
      }, 1200);
    } else {
      setError(result.error || "Failed to submit rating");
    }
  }

  /* ─── Add to calendar handler ─── */
  const handleAddToCalendar = useCallback((booking: Booking) => {
    const dateStr = booking.date.replace(/[۰-۹]/g, (d) =>
      String("۰۱۲۳۴۵۶۷۸۹".indexOf(d))
    );
    const timeMatch = booking.time.match(/(\d{1,2})[:.](\d{2})\s*[-–]\s*(\d{1,2})[:.](\d{2})/);

    let startISO: string;
    let endISO: string;

    if (timeMatch) {
      const [, sh, sm, eh, em] = timeMatch;
      startISO = `${dateStr}T${sh.padStart(2, "0")}:${sm}:00`;
      endISO = `${dateStr}T${eh.padStart(2, "0")}:${em}:00`;
    } else {
      startISO = `${dateStr}T09:00:00`;
      endISO = `${dateStr}T10:00:00`;
    }

    const googleUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(booking.gymName)}&dates=${startISO.replace(/[-:]/g, "")}/${endISO.replace(/[-:]/g, "")}&details=${encodeURIComponent(`جلسه ورزشی در ${booking.gymName} - ${booking.address}`)}&location=${encodeURIComponent(booking.address)}`;
    window.open(googleUrl, "_blank");
  }, []);

  /* ─── Rebook handler ─── */
  const handleRebook = useCallback((booking: Booking) => {
    router.push(`/explore/${booking.gymId}`);
  }, [router]);

  /* ─── Tabs ─── */
  const tabs: { key: TabKey; label: string; count: number }[] = [
    { key: "upcoming", label: t("bookings.upcoming"), count: counts.upcoming },
    { key: "active", label: t("bookings.activeTab"), count: counts.active },
    { key: "completed", label: t("bookings.completed"), count: counts.completed },
    { key: "cancelled", label: t("bookings.cancelled"), count: counts.cancelled },
  ];

  return (
    <div className="px-4 pt-12 pb-8">
      {/* ── Header ── */}
      <motion.h1
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-2xl font-bold text-foreground mb-6"
      >
        {t("bookings.title")}
      </motion.h1>

      {/* ── Tab Bar ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex gap-1.5 mb-6 overflow-x-auto scrollbar-hide"
      >
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`relative flex-shrink-0 py-2 px-3 rounded-xl text-xs font-medium transition-all duration-200 ${
              activeTab === tab.key
                ? "bg-primary text-foreground shadow-lg shadow-blue-500/25"
                : "glass text-foreground/60 hover:text-foreground/80"
            }`}
          >
            <span className="flex items-center justify-center gap-1">
              {tab.label}
              {tab.count > 0 && (
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                    activeTab === tab.key
                      ? "bg-white/20 text-foreground"
                      : "bg-white/10 text-foreground/50"
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </span>
          </button>
        ))}
      </motion.div>

      {/* ── Booking List ── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -15 }}
          transition={{ duration: 0.25, ease: "easeOut" as const }}
          className="space-y-3"
        >
          {loading ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center py-20 text-center"
            >
              <div className="w-16 h-16 rounded-full glass flex items-center justify-center mb-4">
                <div className="w-7 h-7 border-2 border-white/30 border-t-primary rounded-full animate-spin" />
              </div>
              <p className="text-foreground/40 text-sm">{t("bookings.loading")}</p>
            </motion.div>
          ) : error ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center py-20 text-center"
            >
              <div className="w-16 h-16 rounded-full glass flex items-center justify-center mb-4">
                <AlertTriangle className="w-7 h-7 text-red-400" />
              </div>
              <p className="text-foreground/40 text-sm">{error}</p>
            </motion.div>
          ) : filtered.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center py-20 text-center"
            >
              <div className="w-16 h-16 rounded-full glass flex items-center justify-center mb-4">
                <Calendar className="w-7 h-7 text-foreground/30" />
              </div>
              <p className="text-foreground/40 text-sm">{t("bookings.empty")}</p>
              <p className="text-foreground/25 text-xs mt-1">{t("bookings.emptyDesc")}</p>
            </motion.div>
          ) : (
            filtered.map((booking, index) => (
              <motion.div
                key={booking.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  delay: index * 0.08,
                  duration: 0.35,
                  ease: "easeOut" as const,
                }}
                className="glass rounded-2xl p-4 haptic-ready"
              >
                {/* Top row: gym info + status */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary/30 to-purple-500/30 flex items-center justify-center text-lg flex-shrink-0">
                      {booking.sportType === "bodybuilding" ? (
                        <Dumbbell className="w-5 h-5 text-primary" />
                      ) : (
                        <span>
                          {booking.sportType === "boxing"
                            ? "🥊"
                            : booking.sportType === "swimming"
                            ? "🏊"
                            : booking.sportType === "crossfit"
                            ? "🏋️"
                            : "🧘"}
                        </span>
                      )}
                    </div>
                    <div>
                      <h3 className="text-foreground font-semibold text-sm">
                        {booking.gymName}
                      </h3>
                      <div className="flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3 text-foreground/30" />
                        <span className="text-foreground/40 text-xs">{booking.address}</span>
                      </div>
                    </div>
                  </div>
                  <StatusBadge status={booking.status} />
                </div>

                {/* Date/Time row */}
                <div className="flex items-center gap-4 mb-3 px-1">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-primary" />
                    <span className="text-foreground/70 text-xs">{booking.date}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-primary" />
                    <span className="text-foreground/70 text-xs">{booking.time}</span>
                  </div>
                </div>

                {/* Price */}
                <div className="flex items-center justify-between">
                  <span className="text-foreground/50 text-xs">{t("bookings.session")}</span>
                  <span className="text-foreground font-bold text-sm">
                    {formatPrice(BigInt(booking.price))}
                  </span>
                </div>

                {/* Rating display for completed+rated */}
                {booking.status === "completed" && booking.rated && booking.rating && (
                  <div className="mt-3 pt-3 border-t border-white/5">
                    <div className="flex items-center gap-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`w-3.5 h-3.5 ${
                            i < (booking.rating ?? 0)
                              ? "text-yellow-400 fill-yellow-400"
                              : "text-foreground/15"
                          }`}
                        />
                      ))}
                      {booking.comment && (
                        <span className="text-foreground/40 text-xs mr-2 line-clamp-1">
                          {booking.comment}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Action buttons */}
                <div className="mt-3 pt-3 border-t border-white/5 flex items-center gap-2">
                  {/* Show Ticket button — upcoming/active + feature flag */}
                  {ticketEnabled && (booking.status === "upcoming" || booking.status === "active") && booking.checkInCode && (
                    <motion.button
                      whileTap={{ scale: 0.92 }}
                      onClick={() => setTicketTarget(booking)}
                      className="flex-1 py-2 rounded-xl text-xs font-medium text-purple-400 bg-purple-500/10 hover:bg-purple-500/20 transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Ticket className="w-3.5 h-3.5" />
                      {t("bookings.showTicket")}
                    </motion.button>
                  )}

                  {booking.status === "upcoming" && (
                    <>
                      <button
                        onClick={() => setCancelTarget(booking)}
                        className="flex-1 py-2 rounded-xl text-xs font-medium text-red-400 bg-red-500/10 hover:bg-red-500/20 transition-colors"
                      >
                        {t("bookings.cancelBooking")}
                      </button>
                      <motion.button
                        whileTap={{ scale: 0.92 }}
                        onClick={() => handleAddToCalendar(booking)}
                        className="py-2 px-3 rounded-xl text-xs font-medium text-info bg-info/10 hover:bg-info/20 transition-colors flex items-center justify-center gap-1"
                      >
                        <CalendarPlus className="w-3.5 h-3.5" />
                      </motion.button>
                      <motion.button
                        whileTap={{ scale: 0.92 }}
                        onClick={() => router.push(`/explore/${booking.gymId}`)}
                        className="flex-1 py-2 rounded-xl text-xs font-medium text-primary bg-primary/10 hover:bg-primary/20 transition-colors flex items-center justify-center gap-1"
                      >
                        {t("bookings.viewGym")}
                        <ChevronRight className="w-3 h-3" />
                      </motion.button>
                    </>
                  )}
                  {booking.status === "active" && (
                    <motion.button
                      whileTap={{ scale: 0.92 }}
                      onClick={() => router.push(`/explore/${booking.gymId}`)}
                      className="flex-1 py-2 rounded-xl text-xs font-medium text-primary bg-primary/10 hover:bg-primary/20 transition-colors flex items-center justify-center gap-1"
                    >
                      {t("bookings.viewGym")}
                      <ChevronRight className="w-3 h-3" />
                    </motion.button>
                  )}
                  {(booking.status === "completed") && !booking.rated && (
                    <>
                      <button
                        onClick={() => setRateTarget(booking)}
                        className="flex-1 py-2.5 rounded-xl text-xs font-medium text-yellow-400 bg-yellow-500/10 hover:bg-yellow-500/20 transition-colors flex items-center justify-center gap-1.5"
                      >
                        <Star className="w-3.5 h-3.5" />
                        {t("bookings.rateReview")}
                      </button>
                      <motion.button
                        whileTap={{ scale: 0.92 }}
                        onClick={() => handleRebook(booking)}
                        className="py-2.5 px-3 rounded-xl text-xs font-medium text-success bg-success/10 hover:bg-success/20 transition-colors flex items-center justify-center gap-1"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </motion.button>
                    </>
                  )}
                  {booking.status === "completed" && booking.rated && (
                    <>
                      <button className="flex-1 py-2 rounded-xl text-xs font-medium text-foreground/30 glass flex items-center justify-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {t("bookings.completedLabel")}
                      </button>
                      <motion.button
                        whileTap={{ scale: 0.92 }}
                        onClick={() => handleRebook(booking)}
                        className="py-2 px-3 rounded-xl text-xs font-medium text-success bg-success/10 hover:bg-success/20 transition-colors flex items-center justify-center gap-1"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </motion.button>
                    </>
                  )}
                  {booking.status === "expired" && (
                    <motion.button
                      whileTap={{ scale: 0.92 }}
                      onClick={() => handleRebook(booking)}
                      className="flex-1 py-2 rounded-xl text-xs font-medium text-success bg-success/10 hover:bg-success/20 transition-colors flex items-center justify-center gap-1"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      {t("bookings.rebook")}
                    </motion.button>
                  )}
                  {booking.status === "cancelled" && (
                    <button className="w-full py-2 rounded-xl text-xs font-medium text-foreground/30 glass flex items-center justify-center gap-1.5">
                      <XCircle className="w-3.5 h-3.5" />
                      {t("bookings.cancelledLabel")}
                    </button>
                  )}
                </div>
              </motion.div>
            ))
          )}
        </motion.div>
      </AnimatePresence>

      {/* ════════════════════════════════════════════
          TICKET OVERLAY (Full-screen, bright background)
         ════════════════════════════════════════════ */}
      <AnimatePresence>
        {ticketTarget && ticketTarget.checkInCode && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.85, opacity: 0 }}
              transition={{ type: "spring" as const, damping: 25 }}
              className="relative w-[calc(100%-2rem)] max-w-sm max-h-[75vh] overflow-y-auto bg-white rounded-3xl p-6 shadow-2xl"
            >
              {/* Close button */}
              <button
                onClick={() => setTicketTarget(null)}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
              >
                <X className="w-4 h-4 text-gray-600" />
              </button>

              {/* Title */}
              <div className="text-center mb-5">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center mx-auto mb-3">
                  <QrCode className="w-6 h-6 text-foreground" />
                </div>
                <h2 className="text-gray-900 font-bold text-lg">
                  {t("bookings.ticketTitle")}
                </h2>
              </div>

              {/* QR Code */}
              <div className="flex justify-center mb-4">
                <div className="bg-white p-3 rounded-2xl border-2 border-gray-100">
                  <QRCodeSVG
                    value={ticketTarget.checkInCode}
                    size={200}
                    level="M"
                    bgColor="#FFFFFF"
                    fgColor="#1a1a2e"
                  />
                </div>
              </div>

              {/* Check-in Code */}
              <div className="text-center mb-5">
                <p className="text-gray-400 text-xs mb-1">
                  {t("bookings.checkInCode")}
                </p>
                <p className="text-gray-900 text-2xl font-mono font-bold tracking-[0.3em]">
                  {ticketTarget.checkInCode}
                </p>
              </div>

              {/* Divider */}
              <div className="border-t border-dashed border-gray-200 mb-4" />

              {/* Booking Details */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 text-xs">{t("booking.gym")}</span>
                  <span className="text-gray-900 text-sm font-semibold">{ticketTarget.gymName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 text-xs">{t("booking.date")}</span>
                  <span className="text-gray-700 text-sm">{ticketTarget.date}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 text-xs">{t("booking.time")}</span>
                  <span className="text-gray-700 text-sm">{ticketTarget.time}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 text-xs">{t("booking.price")}</span>
                  <span className="text-gray-900 text-sm font-bold">
                    {formatPrice(BigInt(ticketTarget.price))}
                  </span>
                </div>
              </div>

              {/* Status badge */}
              <div className="mt-4 flex justify-center">
                <StatusBadge status={ticketTarget.status} />
              </div>

              {/* Bottom note */}
              <p className="text-center text-gray-300 text-[10px] mt-4">
                {t("bookings.ticketNote")}
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ════════════════════════════════════════════
          CANCEL MODAL
         ════════════════════════════════════════════ */}
      <AnimatePresence>
        {cancelTarget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 backdrop-blur-sm px-6"
            onClick={() => {
              if (!cancelProcessing) setCancelTarget(null);
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring" as const, damping: 25 }}
              onClick={(e) => e.stopPropagation()}
              className="glass rounded-3xl p-6 w-full max-w-sm"
            >
              {cancelDone ? (
                <div className="flex flex-col items-center py-4">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring" as const, damping: 15 }}
                  >
                    <CheckCircle2 className="w-14 h-14 text-green-400 mb-3" />
                  </motion.div>
                  <p className="text-foreground font-semibold">
                    {t("bookings.cancelledLabel")}
                  </p>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                      <AlertTriangle className="w-5 h-5 text-red-400" />
                    </div>
                    <div>
                      <h3 className="text-foreground font-semibold text-sm">
                        {t("bookings.cancelBooking")}
                      </h3>
                      <p className="text-foreground/40 text-xs">{cancelTarget.gymName}</p>
                    </div>
                  </div>

                  <p className="text-foreground/50 text-xs mb-5 leading-relaxed">
                    {cancelTarget.date} · {cancelTarget.time}
                  </p>

                  <div className="flex gap-3">
                    <button
                      onClick={() => setCancelTarget(null)}
                      disabled={cancelProcessing}
                      className="flex-1 py-2.5 rounded-xl text-sm font-medium glass text-foreground/60 hover:text-foreground/80 transition-colors disabled:opacity-50"
                    >
                      {t("booking.close")}
                    </button>
                    <button
                      onClick={handleCancel}
                      disabled={cancelProcessing}
                      className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-red-500 text-foreground hover:bg-red-600 transition-colors disabled:opacity-50"
                    >
                      {cancelProcessing ? t("booking.processing") : t("bookings.cancelBooking")}
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ════════════════════════════════════════════
          RATE & REVIEW MODAL
         ════════════════════════════════════════════ */}
      <AnimatePresence>
        {rateTarget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-background/70 backdrop-blur-sm"
            onClick={() => {
              if (!rateDone) setRateTarget(null);
            }}
          >
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              transition={{ type: "spring" as const, damping: 25 }}
              onClick={(e) => e.stopPropagation()}
              className="glass rounded-t-3xl sm:rounded-3xl p-6 w-full max-w-sm"
            >
              {rateDone ? (
                <div className="flex flex-col items-center py-6">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring" as const, damping: 15 }}
                  >
                    <CheckCircle2 className="w-14 h-14 text-green-400 mb-3" />
                  </motion.div>
                  <p className="text-foreground font-semibold">
                    {t("bookings.submitReview")}
                  </p>
                  <div className="flex items-center gap-1 mt-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`w-5 h-5 ${
                          i < rateStars
                            ? "text-yellow-400 fill-yellow-400"
                            : "text-foreground/15"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-5">
                    <div>
                      <h3 className="text-foreground font-semibold">
                        {t("bookings.reviewTitle")}
                      </h3>
                      <p className="text-foreground/40 text-xs mt-0.5">
                        {rateTarget.gymName}
                      </p>
                    </div>
                    <button
                      onClick={() => setRateTarget(null)}
                      className="w-8 h-8 rounded-full glass flex items-center justify-center"
                    >
                      <X className="w-4 h-4 text-foreground/50" />
                    </button>
                  </div>

                  <p className="text-foreground/50 text-xs mb-4">
                    {t("bookings.reviewDesc")}
                  </p>

                  <div className="flex items-center justify-center gap-2 mb-5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <motion.button
                        key={i}
                        whileTap={{ scale: 0.85 }}
                        onClick={() => setRateStars(i + 1)}
                        onMouseEnter={() => setRateHover(i + 1)}
                        onMouseLeave={() => setRateHover(0)}
                        className="p-1"
                      >
                        <Star
                          className={`w-9 h-9 transition-colors ${
                            i < (rateHover || rateStars)
                              ? "text-yellow-400 fill-yellow-400"
                              : "text-foreground/15"
                          }`}
                        />
                      </motion.button>
                    ))}
                  </div>

                  <textarea
                    value={rateComment}
                    onChange={(e) => setRateComment(e.target.value)}
                    placeholder={t("bookings.writeComment")}
                    rows={3}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-foreground text-sm placeholder:text-foreground/25 focus:outline-none focus:border-primary/50 resize-none mb-4"
                  />

                  <button
                    onClick={handleSubmitRate}
                    disabled={rateStars === 0}
                    className="w-full py-3 rounded-xl text-sm font-bold bg-primary text-foreground hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {t("bookings.submitReview")}
                  </button>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}