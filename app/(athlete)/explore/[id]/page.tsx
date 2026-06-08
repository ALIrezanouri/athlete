"use client";

import { useState, useMemo, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowRight,
  Star,
  MapPin,
  Clock,
  Phone,
  Globe,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Heart,
  Share2,
  Dumbbell,
  Flame,
  Swords,
  Waves,
  Bike,
  ShowerHead,
  Wifi,
  Car,
  Accessibility,
  Utensils,
  Lock,
  Users,
  Navigation,
  Calendar,
  Wallet,
  CheckCircle2,
  AlertCircle,
  X,
} from "lucide-react";
import { useGlobalEngine } from "@/lib/GlobalEngineContext";
import { getGymById, getGymTimeSlots } from "@/app/actions/gyms";
import { getWallet } from "@/app/actions/wallet";
import { createBooking } from "@/app/actions/bookings";

// ─── Amenity icon mapper ────────────────────────────────────────────
function getAmenityIcon(key: string) {
  const map: Record<string, React.ComponentType<{ className?: string }>> = {
    shower: ShowerHead,
    wifi: Wifi,
    parking: Car,
    accessibility: Accessibility,
    cafeteria: Utensils,
    locker: Lock,
    trainers: Users,
  };
  return map[key] ?? Dumbbell;
}

function getSportTypeLabel(key: string | undefined | null) {
  if (!key) return "";
  const labels: Record<string, string> = {
    bodybuilding: "بدنسازی",
    crossfit: "کراسفیت",
    boxing: "بوکس",
    swimming: "شنا",
    yoga: "یوگا",
    fitness: "فیتنس",
    martial_arts: "هنرهای رزمی",
    pilates: "پیلاتس",
    cycling: "دوچرخه‌سواری",
    functional_training: "تمرین عملکردی",
  };
  return labels[key] ?? key.replace(/_/g, " ");
}

function getAmenityLabel(key: string) {
  const labels: Record<string, string> = {
    shower: "دوش",
    wifi: "وای‌فای",
    parking: "پارکینگ",
    accessibility: "دسترسی‌پذیر",
    cafeteria: "کافه",
    locker: "کمد شخصی",
    trainers: "مربی شخصی",
  };
  return labels[key] ?? key;
}



// ─── Generate next 7 days ───────────────────────────────────────────
function getNext7Days() {
  const days = [];
  const now = new Date();
  for (let i = 0; i < 7; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() + i);
    days.push(d);
  }
  return days;
}



// ─── Booking modal step ────────────────────────────────────────────
type BookingStep = "summary" | "processing" | "success" | "insufficient";

// ─── Page Component ─────────────────────────────────────────────────
export default function GymDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { t, formatPrice, dir } = useGlobalEngine();

  const id = params.id as string;
  
  // State for fetched data
  const [gym, setGym] = useState<any>(null);
  const [wallet, setWallet] = useState<{ balance: number } | null>(null);
  const [timeSlots, setTimeSlots] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingTimeSlots, setLoadingTimeSlots] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedDate, setSelectedDate] = useState<Date>(getNext7Days()[0]);
  const [selectedTimeSlotId, setSelectedTimeSlotId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [bookingStep, setBookingStep] = useState<BookingStep>("summary");

  // Fetch time slots from database when selected date changes
  useEffect(() => {
    async function fetchTimeSlots() {
      if (!gym) return;
      
      try {
        setLoadingTimeSlots(true);
        const dateStr = selectedDate.toISOString().split('T')[0];
        const result = await getGymTimeSlots(id, dateStr);
        
        if (result.success && result.data) {
          const mappedSlots = result.data.map((slot: any) => ({
            id: slot.id,
            start: slot.start_time,
            end: slot.end_time,
            capacity: slot.capacity,
            booked: slot.booked_count,
            isAvailable: slot.is_available && slot.booked_count < slot.capacity,
            remaining: slot.capacity - slot.booked_count,
          }));
          setTimeSlots(mappedSlots);
        } else {
          console.error('Error fetching time slots:', result.error);
          setTimeSlots([]);
        }
      } catch (err) {
        console.error('Error fetching time slots:', err);
        setTimeSlots([]);
      } finally {
        setLoadingTimeSlots(false);
      }
    }
    
    fetchTimeSlots();
  }, [id, selectedDate, gym]);
  
  const availableDays = useMemo(() => getNext7Days(), []);

  // Fetch gym data and wallet data on component mount
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        setError(null);

        // Fetch gym data
        const gymResult = await getGymById(id);
        if (gymResult.success && gymResult.data) {
          setGym(gymResult.data);
        } else {
          setError('Gym not found');
        }

        // Fetch wallet data
        const walletResult = await getWallet();
        if (walletResult.success && walletResult.wallet) {
          setWallet({ balance: walletResult.wallet.balance });
        }
      } catch (err) {
        console.error('Error fetching gym detail data:', err);
        setError('Failed to load data');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [id]);

  // Check if gym is currently open
  const now = new Date();
  const currentHour = now.getHours();
  const [openH, openM] = (gym?.open_time || "06:00").split(":").map(Number);
  const [closeH, closeM] = (gym?.close_time || "23:00").split(":").map(Number);
  const isOpen =
    currentHour >= openH && currentHour < closeH;

  // Format date for display
  function formatDate(d: Date) {
    return d.toLocaleDateString(dir === "rtl" ? "fa-IR" : "en-US", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
  }

  function getDayLabel(d: Date, index: number) {
    if (index === 0) return t("gymDetail.today");
    if (index === 1) return t("gymDetail.tomorrow");
    return d.toLocaleDateString(dir === "rtl" ? "fa-IR" : "en-US", {
      weekday: "short",
    });
  }

  return (
    <div className="min-h-screen gradient-mesh pb-28">
      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center min-h-screen">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/20 border-t-primary" />
        </div>
      )}

      {/* Error state */}
      {error && !loading && (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <p className="text-foreground/60">{error}</p>
          </div>
        </div>
      )}

      {/* Content */}
      {!loading && !error && gym && (
        <>
      {/* ─── Photo Gallery Placeholder ─────────────────────────── */}
      <div className="relative h-72 w-full overflow-hidden bg-gradient-to-br from-[#1a1a2e] to-[#16213e]">
        <div className="absolute inset-0 flex items-center justify-center">
          <Dumbbell className="h-20 w-20 text-foreground/10" />
        </div>

        {/* Top bar overlay */}
        <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between px-4 pt-4">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => router.back()}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-background/40 backdrop-blur-md"
          >
            <ArrowRight className="h-5 w-5 text-foreground rotate-180" />
          </motion.button>

          <div className="flex gap-2">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={async () => {
                const shareData = { title: gym.name, text: gym.description, url: window.location.href };
                if (navigator.share) {
                  try { await navigator.share(shareData); } catch {}
                } else {
                  await navigator.clipboard.writeText(window.location.href);
                }
              }}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-background/40 backdrop-blur-md"
            >
              <Share2 className="h-5 w-5 text-foreground" />
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setIsFavorited(!isFavorited)}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-background/40 backdrop-blur-md"
            >
              <Heart
                className={`h-5 w-5 ${isFavorited ? "fill-red-500 text-red-500" : "text-foreground"}`}
              />
            </motion.button>
          </div>
        </div>

        {/* Photo counter */}
        <div className="absolute bottom-4 left-4 z-10 rounded-full bg-background/50 px-3 py-1 backdrop-blur-md">
          <span className="text-xs text-foreground/80">1/5</span>
        </div>
      </div>

      {/* ─── Basic Info ────────────────────────────────────────── */}
      <div className="px-4 pt-4">
        {/* Name + Price */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <h1 className="text-xl font-bold text-foreground">{gym.name}</h1>
            <div className="mt-1.5 flex items-center gap-2 text-sm text-foreground/50">
              <MapPin className="h-3.5 w-3.5" />
              <span>{gym.address}</span>
            </div>
          </div>
          <div className="shrink-0 text-end">
            <span className="text-lg font-bold text-primary">
              {formatPrice(BigInt(gym.price_per_session))}
            </span>
            <p className="text-[10px] text-foreground/40">{t("gymDetail.perSession")}</p>
          </div>
        </div>

        {/* Rating + Status */}
        <div className="mt-3 flex items-center gap-3">
          <div className="flex items-center gap-1.5 rounded-full bg-warning/10 px-3 py-1.5">
            <Star className="h-4 w-4 fill-warning text-warning" />
            <span className="text-sm font-semibold text-warning">
              {gym.rating}
            </span>
            <span className="text-xs text-foreground/40">
              ({gym.review_count} {t("explore.reviews")})
            </span>
          </div>

          <div
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 ${
              isOpen ? "bg-success/10" : "bg-red-500/10"
            }`}
          >
            <Clock className={`h-3.5 w-3.5 ${isOpen ? "text-success" : "text-red-400"}`} />
            <span className={`text-xs font-medium ${isOpen ? "text-success" : "text-red-400"}`}>
              {isOpen ? t("gymDetail.open") : t("gymDetail.closed")}
            </span>
          </div>
        </div>

        {/* Sport types */}
        <div className="mt-3 flex flex-wrap gap-2">
          <span
            className="rounded-full bg-white/5 px-3 py-1 text-xs text-foreground/60"
          >
            {getSportTypeLabel(gym.sport_type) || "تمرین"}
          </span>
        </div>
      </div>

      {/* ─── Divider ───────────────────────────────────────────── */}
      <div className="mx-4 my-5 h-px bg-white/5" />

      {/* ─── About Section ─────────────────────────────────────── */}
      <div className="px-4">
        <h2 className="text-base font-semibold text-foreground">{t("gymDetail.about")}</h2>
        <div className="mt-2">
          <p className={`text-sm leading-relaxed text-foreground/60 ${!expanded ? "line-clamp-3" : ""}`}>
            {gym.description}
          </p>
          <button
            onClick={() => setExpanded(!expanded)}
            className="mt-1 flex items-center gap-1 text-xs font-medium text-primary"
          >
            {expanded ? t("gymDetail.readLess") : t("gymDetail.readMore")}
            {expanded ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* ─── Divider ───────────────────────────────────────────── */}
      <div className="mx-4 my-5 h-px bg-white/5" />

      {/* ─── Working Hours ─────────────────────────────────────── */}
      <div className="px-4">
        <h2 className="text-base font-semibold text-foreground">
          {t("gymDetail.workingHours")}
        </h2>
        <div className="mt-2 glass-card p-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-foreground/60">
              {t("gymDetail.open")}: {gym.open_time} — {gym.close_time}
            </span>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                isOpen
                  ? "bg-success/10 text-success"
                  : "bg-red-500/10 text-red-400"
              }`}
            >
              {isOpen ? t("gymDetail.open") : t("gymDetail.closed")}
            </span>
          </div>
        </div>
      </div>

      {/* ─── Divider ───────────────────────────────────────────── */}
      <div className="mx-4 my-5 h-px bg-white/5" />

      {/* ─── Time Slot Booking ──────────────────────────────────── */}
      <div className="px-4">
        <h2 className="text-base font-semibold text-foreground">
          {t("gymDetail.selectDate")}
        </h2>

        {/* Date picker horizontal scroll */}
        <div className="mt-3 flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {availableDays.map((day, index) => {
            const isSelected =
              day.toDateString() === selectedDate.toDateString();
            return (
              <motion.button
                key={day.toISOString()}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  setSelectedDate(day);
                  setSelectedTimeSlotId(null);
                }}
                className={`flex shrink-0 flex-col items-center gap-1 rounded-xl px-4 py-3 transition-colors ${
                  isSelected
                    ? "bg-primary text-foreground"
                    : "bg-white/5 text-foreground/60"
                }`}
              >
                <span className="text-[10px] font-medium">
                  {getDayLabel(day, index)}
                </span>
                <span className="text-sm font-bold">
                  {day.toLocaleDateString(dir === "rtl" ? "fa-IR" : "en-US", {
                    day: "numeric",
                  })}
                </span>
              </motion.button>
            );
          })}
        </div>

        {/* Time slots grid */}
        <h3 className="mt-4 text-sm font-medium text-foreground/60">
          {t("gymDetail.selectTime")}
        </h3>
        {loadingTimeSlots ? (
          <div className="mt-2 flex items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/20 border-t-primary" />
          </div>
        ) : (
          <div className="mt-2 grid grid-cols-3 gap-2">
            {timeSlots.map((slot) => {
              const isSelected = selectedTimeSlotId === slot.id;
              const isFull = !slot.isAvailable;

              return (
                <motion.button
                  key={slot.id}
                  whileTap={{ scale: 0.95 }}
                  disabled={isFull}
                  onClick={() => setSelectedTimeSlotId(slot.id)}
                  className={`relative rounded-xl px-3 py-2.5 text-center transition-colors ${
                    isFull
                      ? "bg-white/[0.02] text-foreground/20"
                      : isSelected
                        ? "bg-primary text-foreground"
                        : "bg-white/5 text-foreground/70 hover:bg-white/10"
                  }`}
                >
                  <span className="text-sm font-semibold">
                    {slot.start}
                  </span>
                  <div className="mt-0.5">
                    {isFull ? (
                      <span className="text-[10px] text-red-400">
                        {t("gymDetail.full")}
                      </span>
                    ) : (
                      <span className="text-[10px] text-foreground/40">
                        {slot.remaining} {t("gymDetail.sessionsLeft")}
                      </span>
                    )}
                  </div>
                </motion.button>
              );
            })}
          </div>
        )}
      </div>

      {/* ─── Divider ───────────────────────────────────────────── */}
      <div className="mx-4 my-5 h-px bg-white/5" />

      {/* ─── Trainers ──────────────────────────────────────────── */}
      <div className="px-4">
        <h2 className="text-base font-semibold text-foreground">
          {t("gymDetail.trainers")}
        </h2>
        <div className="mt-3 flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
          {gym.trainers.map((trainer: any, i: number) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1, ease: "easeOut" as const }}
              className="glass-card flex shrink-0 flex-col items-center gap-2 p-4"
              style={{ minWidth: 120 }}
            >
              {/* Avatar placeholder */}
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <span className="text-sm font-semibold text-foreground">
                {trainer.name}
              </span>
              <span className="text-[10px] text-foreground/40">
                {trainer.specialty}
              </span>
            </motion.div>
          ))}
        </div>
      </div>

      {/* ─── Divider ───────────────────────────────────────────── */}
      <div className="mx-4 my-5 h-px bg-white/5" />

      {/* ─── Amenities ─────────────────────────────────────────── */}
      <div className="px-4">
        <h2 className="text-base font-semibold text-foreground">
          {t("gymDetail.amenities")}
        </h2>
        <div className="mt-3 grid grid-cols-4 gap-3">
          {gym.amenities.map((amenity: string) => {
            const Icon = getAmenityIcon(amenity);
            return (
              <div
                key={amenity}
                className="glass-card flex flex-col items-center gap-2 p-3"
              >
                <Icon className="h-5 w-5 text-primary" />
                <span className="text-[10px] text-foreground/50">
                  {getAmenityLabel(amenity)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── Divider ───────────────────────────────────────────── */}
      <div className="mx-4 my-5 h-px bg-white/5" />

      {/* ─── Location ──────────────────────────────────────────── */}
      <div className="px-4">
        <h2 className="text-base font-semibold text-foreground">
          {t("gymDetail.location")}
        </h2>
        <div className="mt-3 overflow-hidden rounded-2xl">
          {/* Map placeholder */}
          <div className="relative h-44 bg-gradient-to-br from-[#1a1a2e] to-[#0f3460]">
            <div className="absolute inset-0 flex items-center justify-center">
              <MapPin className="h-10 w-10 text-primary/30" />
            </div>
            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-3">
              <p className="text-xs text-foreground/70">{gym.address}</p>
            </div>
          </div>
        </div>
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => window.open(`https://maps.google.com/?q=${encodeURIComponent(gym.address)}`, "_blank")}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-white/5 py-3 text-sm font-medium text-primary"
        >
          <Navigation className="h-4 w-4" />
          {t("gymDetail.getDirections")}
        </motion.button>
      </div>

      {/* ─── Divider ───────────────────────────────────────────── */}
      <div className="mx-4 my-5 h-px bg-white/5" />

      {/* ─── Contact ───────────────────────────────────────────── */}
      <div className="px-4">
        <h2 className="text-base font-semibold text-foreground">
          {t("gymDetail.contact")}
        </h2>
        <div className="mt-3 flex flex-col gap-2">
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => gym.phone && window.open(`tel:${gym.phone}`, "_self")}
            className="glass-card flex items-center gap-3 p-3"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
              <Phone className="h-4 w-4 text-primary" />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] text-foreground/40">{t("gymDetail.phone")}</span>
              <span className="text-sm text-foreground/80" dir="ltr">{gym.phone}</span>
            </div>
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => {
              if (!gym.instagram) return;
              const url = gym.instagram.startsWith("http") ? gym.instagram : `https://instagram.com/${gym.instagram.replace("@", "")}`;
              window.open(url, "_blank");
            }}
            className="glass-card flex items-center gap-3 p-3"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#E1306C]/10">
              <ExternalLink className="h-4 w-4 text-[#E1306C]" />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] text-foreground/40">{t("gymDetail.instagram")}</span>
              <span className="text-sm text-foreground/80">{gym.instagram}</span>
            </div>
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => {
              if (!gym.website) return;
              const url = gym.website.startsWith("http") ? gym.website : `https://${gym.website}`;
              window.open(url, "_blank");
            }}
            className="glass-card flex items-center gap-3 p-3"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-success/10">
              <Globe className="h-4 w-4 text-success" />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] text-foreground/40">{t("gymDetail.website")}</span>
              <span className="text-sm text-foreground/80" dir="ltr">{gym.website}</span>
            </div>
          </motion.button>
        </div>
      </div>

      {/* ─── Divider ───────────────────────────────────────────── */}
      <div className="mx-4 my-5 h-px bg-white/5" />

      {/* ─── Reviews ───────────────────────────────────────────── */}
      <div className="px-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">
            {t("gymDetail.reviews")}
          </h2>
          <span className="text-xs text-foreground/40">
            {gym.reviewCount} {t("explore.reviews")}
          </span>
        </div>

        {/* Rating summary */}
        <div className="glass-card mt-3 flex items-center gap-4 p-4">
          <div className="flex flex-col items-center">
            <span className="text-3xl font-bold text-warning">
              {gym.rating}
            </span>
            <div className="mt-1 flex gap-0.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`h-3 w-3 ${
                    star <= Math.round(gym.rating)
                      ? "fill-warning text-warning"
                      : "text-foreground/10"
                  }`}
                />
              ))}
            </div>
          </div>
          <div className="h-12 w-px bg-white/10" />
          <div className="flex flex-1 flex-col gap-1">
            {[5, 4, 3, 2, 1].map((star) => {
              const percentage =
                star === 5 ? 65 : star === 4 ? 25 : star === 3 ? 7 : star === 2 ? 2 : 1;
              return (
                <div key={star} className="flex items-center gap-2">
                  <span className="w-3 text-[10px] text-foreground/40">{star}</span>
                  <Star className="h-2.5 w-2.5 fill-warning text-warning" />
                  <div className="flex-1 overflow-hidden rounded-full bg-white/5">
                    <div
                      className="h-1.5 rounded-full bg-warning"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Individual reviews */}
        <div className="mt-4 flex flex-col gap-3">
          {gym.reviews.map((review: any, i: number) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1, ease: "easeOut" as const }}
              className="glass-card p-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                    <span className="text-xs font-bold text-primary">
                      {review.name.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-foreground">
                      {review.name}
                    </span>
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          className={`h-2.5 w-2.5 ${
                            s <= review.rating
                              ? "fill-warning text-warning"
                              : "text-foreground/10"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
                <span className="text-[10px] text-foreground/30">{review.date}</span>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-foreground/60">
                {review.comment}
              </p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* ─── Sticky Buy Session CTA ────────────────────────────── */}
      <div className="fixed inset-x-0 bottom-[68px] z-[60] border-t border-white/5 bg-background/80 px-4 pb-4 pt-3 backdrop-blur-xl">
        <div className="flex items-center justify-between gap-3">
          <div>
            <span className="text-lg font-bold text-primary">
              {formatPrice(BigInt(gym.price_per_session))}
            </span>
            <p className="text-[10px] text-foreground/40">{t("gymDetail.perSession")}</p>
          </div>
          <motion.button
            whileTap={{ scale: 0.97 }}
            disabled={!selectedTimeSlotId}
            onClick={() => {
              if (wallet && wallet.balance >= gym.price_per_session) {
                setBookingStep("summary");
              } else {
                setBookingStep("insufficient");
              }
              setShowBookingModal(true);
            }}
            className={`flex items-center gap-2 rounded-2xl px-8 py-3.5 font-semibold transition-colors ${
              selectedTimeSlotId
                ? "bg-primary text-foreground"
                : "bg-white/10 text-foreground/30"
            }`}
          >
            <Calendar className="h-4 w-4" />
            {t("gymDetail.buySession")}
          </motion.button>
        </div>
      </div>

      {/* ─── Booking Modal Overlay ──────────────────────────────── */}
      <AnimatePresence>
        {showBookingModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] flex items-end justify-center bg-background/70 backdrop-blur-sm"
            onClick={() => setShowBookingModal(false)}
          >
            <motion.div
              initial={{ y: 300, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 300, opacity: 0 }}
              transition={{ type: "spring" as const, damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg rounded-t-3xl border border-white/10 bg-background p-6 pb-10"
            >
              {/* ── Close button ── */}
              <div className="mb-4 flex justify-end">
                <button
                  onClick={() => setShowBookingModal(false)}
                  className="rounded-full p-1.5 transition-colors hover:bg-white/10"
                >
                  <X className="h-5 w-5 text-foreground/60" />
                </button>
              </div>

              {/* ── SUMMARY step ── */}
              {bookingStep === "summary" && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-5"
                >
                  <h3 className="text-lg font-bold text-foreground">
                    {t("booking.title")}
                  </h3>

                  <div className="space-y-3 rounded-2xl border border-white/5 bg-white/[0.03] p-4">
                    <div className="flex justify-between">
                      <span className="text-sm text-foreground/50">{t("booking.gym")}</span>
                      <span className="text-sm font-medium text-foreground">{gym.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-foreground/50">{t("booking.date")}</span>
                      <span className="text-sm font-medium text-foreground">
                        {selectedDate.toLocaleDateString("fa-IR")}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-foreground/50">{t("booking.time")}</span>
                      <span className="text-sm font-medium text-foreground">
                        {timeSlots.find((slot) => slot.id === selectedTimeSlotId)?.start || ""}
                      </span>
                    </div>
                    <div className="h-px bg-white/10" />
                    <div className="flex justify-between">
                      <span className="text-sm text-foreground/50">{t("booking.price")}</span>
                      <span className="text-sm font-bold text-primary">
                        {formatPrice(BigInt(gym.price_per_session))}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-foreground/50">{t("booking.walletBalance")}</span>
                      <span className="text-sm font-medium text-foreground">
                        {wallet ? formatPrice(BigInt(wallet.balance)) : "Loading..."}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-foreground/50">{t("booking.balanceAfter")}</span>
                      <span className="text-sm font-medium text-success">
                        {wallet ? formatPrice(BigInt(wallet.balance - gym.price_per_session)) : "Loading..."}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowBookingModal(false)}
                      className="flex-1 rounded-2xl border border-white/10 py-3 text-sm font-semibold text-foreground/70 transition-colors hover:bg-white/5"
                    >
                      {t("booking.cancel")}
                    </button>
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      onClick={async () => {
                        setBookingStep("processing");
                        try {
                          const result = await createBooking({
                            timeSlotId: selectedTimeSlotId!,
                            gymId: id
                          });
                          if (result.success) {
                            setBookingStep("success");
                          } else {
                            console.error('Error creating booking:', result.error);
                            setBookingStep("insufficient");
                          }
                        } catch (error) {
                          console.error('Error creating booking:', error);
                          setBookingStep("insufficient");
                        }
                      }}
                      className="flex-1 rounded-2xl bg-primary py-3 text-sm font-semibold text-foreground transition-colors hover:bg-primary/90"
                    >
                      {t("booking.confirm")}
                    </motion.button>
                  </div>
                </motion.div>
              )}

              {/* ── PROCESSING step ── */}
              {bookingStep === "processing" && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col items-center gap-4 py-8"
                >
                  <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/20 border-t-primary" />
                  <p className="text-sm text-foreground/60">{t("booking.processing")}</p>
                </motion.div>
              )}

              {/* ── SUCCESS step ── */}
              {bookingStep === "success" && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center gap-4 py-6"
                >
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-success/20">
                    <CheckCircle2 className="h-8 w-8 text-success" />
                  </div>
                  <h3 className="text-lg font-bold text-foreground">{t("booking.success")}</h3>
                  <p className="text-center text-sm text-foreground/50">
                    {t("booking.successDesc")}
                  </p>
                  <div className="mt-2 flex w-full gap-3">
                    <button
                      onClick={() => {
                        setShowBookingModal(false);
                        router.push("/bookings");
                      }}
                      className="flex-1 rounded-2xl bg-primary py-3 text-sm font-semibold text-foreground"
                    >
                      {t("booking.viewBookings")}
                    </button>
                    <button
                      onClick={() => setShowBookingModal(false)}
                      className="flex-1 rounded-2xl border border-white/10 py-3 text-sm font-semibold text-foreground/70"
                    >
                      {t("booking.backToGym")}
                    </button>
                  </div>
                </motion.div>
              )}

              {/* ── INSUFFICIENT BALANCE step ── */}
              {bookingStep === "insufficient" && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center gap-4 py-6"
                >
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500/20">
                    <AlertCircle className="h-8 w-8 text-red-400" />
                  </div>
                  <h3 className="text-lg font-bold text-foreground">
                    {t("booking.insufficientBalance")}
                  </h3>
                  <p className="text-center text-sm text-foreground/50">
                    {t("booking.insufficientDesc")}
                  </p>
                  <div className="mt-2 flex w-full gap-3">
                    <button
                      onClick={() => {
                        setShowBookingModal(false);
                        router.push("/profile");
                      }}
                      className="flex-1 rounded-2xl bg-primary py-3 text-sm font-semibold text-foreground"
                    >
                      <Wallet className="mr-1 inline h-4 w-4" />
                      {t("booking.topUp")}
                    </button>
                    <button
                      onClick={() => setShowBookingModal(false)}
                      className="flex-1 rounded-2xl border border-white/10 py-3 text-sm font-semibold text-foreground/70"
                    >
                      {t("booking.cancel")}
                    </button>
                  </div>
                </motion.div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
        </>
      )}
    </div>
  );
}
