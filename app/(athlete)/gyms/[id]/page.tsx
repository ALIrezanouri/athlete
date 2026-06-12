"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowRight,
  Star,
  MapPin,
  Clock,
  Phone,
  Camera,
  Globe,
  Heart,
  Share2,
  ChevronLeft,
  X,
  Check,
  Loader2,
  AlertCircle,
  Wallet,
  CreditCard,
  User,
  Dumbbell,
  Users,
  MessageSquare,
  Shield,
} from "lucide-react";
import { getGymDetail, getGymTimeSlots } from "@/app/actions/gyms";
import { createBooking } from "@/app/actions/bookings";
import { getWallet } from "@/app/actions/wallet";
import { useGlobalEngine } from "@/lib/GlobalEngineContext";

// ── Types ──
interface GymPhoto {
  url: string;
  is_primary: boolean;
  sort_order: number;
}

interface Trainer {
  name: string;
  specialty: string | null;
  photo_url: string | null;
}

interface Review {
  athlete_name: string | null;
  rating: number;
  comment: string | null;
  created_at: string;
}

interface GymData {
  id: string;
  name: string;
  description: string | null;
  address: string;
  city: string;
  area: string | null;
  avg_rating: number;
  review_count: number;
  price_per_session: number;
  open_time: string;
  close_time: string;
  latitude: number | null;
  longitude: number | null;
  phone: string | null;
  instagram: string | null;
  website: string | null;
  photos: GymPhoto[];
  amenities: string[];
  sport_types: string[];
  trainers: Trainer[];
  reviews: Review[];
}

interface TimeSlotData {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  capacity: number;
  booked_count: number;
  is_available: boolean;
}

// ── Helpers ──
const PERSIAN_AMENITIES: Record<string, string> = {
  parking: "🅿️ پارکینگ", locker: "🔒 لوکر", shower: "🚿 دوش", sauna: "🔥 سونا",
  pool: "🏊 استخر", wifi: "📶 وای‌فای", ac: "❄️ کولر", personal_training: "👨‍🏫 مربی شخصی",
  group_classes: "👥 کلاس گروهی", cardio: "🏃 کاردیو", free_weights: "🏋️ وزنه آزاد",
  machines: "⚙️ دستگاه", stretching_area: "🧘 فضای کشش", juice_bar: "🥤 آبمیوه‌بار",
};

const PERSIAN_SPORTS: Record<string, string> = {
  bodybuilding: "بدنسازی", crossfit: "کراسفیت", yoga: "یوگا", pilates: "پیلاتس",
  boxing: "بوکس", swimming: "شنا", martial_arts: "هنرهای رزمی", spinning: "اسپینینگ",
  fitness: "فیتنس", functional: "فانکشنال", powerlifting: "پاورلیفتینگ",
};

function formatDatePersian(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("fa-IR", { weekday: "short", month: "short", day: "numeric" });
}

function getNext7Days(): { label: string; value: string; dayName: string }[] {
  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const value = d.toISOString().split("T")[0];
    const dayName = d.toLocaleDateString("fa-IR", { weekday: "short" });
    const label = i === 0 ? "امروز" : i === 1 ? "فردا" : d.toLocaleDateString("fa-IR", { day: "numeric" });
    days.push({ label, value, dayName });
  }
  return days;
}

// ── Animation ──
const containerV = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.04, delayChildren: 0.1 } },
};
const itemV = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] as const } },
};

// ── Main Component ──
export default function GymDetailPage() {
  const router = useRouter();
  const params = useParams();
  const gymId = params.id as string;
  const { formatPrice } = useGlobalEngine();

  const [gym, setGym] = useState<GymData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Photo gallery
  const [currentPhoto, setCurrentPhoto] = useState(0);

  // Date & time selection
  const [selectedDate, setSelectedDate] = useState(getNext7Days()[0].value);
  const [timeSlots, setTimeSlots] = useState<TimeSlotData[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);

  // Wallet
  const [walletBalance, setWalletBalance] = useState(0);

  // Booking flow
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [isBooking, setIsBooking] = useState(false);
  const [bookingResult, setBookingResult] = useState<{ success: boolean; data?: any; error?: string } | null>(null);

  // Favorites (local state, no backend)
  const [isFav, setIsFav] = useState(false);

  // ── Fetch gym detail ──
  useEffect(() => {
    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const [res, walletRes] = await Promise.all([
          getGymDetail(gymId),
          getWallet(),
        ]);
        if (!res.success || !res.data) throw new Error(res.error || "Not found");
        setGym(res.data);

        if (walletRes.success && walletRes.wallet) setWalletBalance(walletRes.wallet.balance);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load");
      } finally {
        setIsLoading(false);
      }
    }
    if (gymId) load();
  }, [gymId]);

  // ── Fetch time slots when date changes ──
  const fetchTimeSlots = useCallback(async (date: string) => {
    setLoadingSlots(true);
    setSelectedSlot(null);
    try {
      const res = await getGymTimeSlots(gymId, date);
      if (res.success) setTimeSlots(res.data ?? []);
      else setTimeSlots([]);
    } catch {
      setTimeSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  }, [gymId]);

  useEffect(() => {
    if (selectedDate && gymId) fetchTimeSlots(selectedDate);
  }, [selectedDate, gymId, fetchTimeSlots]);

  // ── Booking handler ──
  async function handleBooking() {
    if (!selectedSlot || !gymId) return;
    setIsBooking(true);
    setBookingResult(null);
    try {
      const res = await createBooking({ timeSlotId: selectedSlot, gymId });
      setBookingResult(res);
      if (res.success) {
        // Refresh wallet balance
        const walletRes = await getWallet();
        if (walletRes.success && walletRes.wallet) setWalletBalance(walletRes.wallet.balance);
      }
    } catch (err) {
      setBookingResult({ success: false, error: "خطا در ثبت رزرو" });
    } finally {
      setIsBooking(false);
    }
  }

  // ── Loading state ──
  if (isLoading) {
    return (
      <div className="min-h-screen gradient-mesh flex items-center justify-center" dir="rtl">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error || !gym) {
    return (
      <div className="min-h-screen gradient-mesh flex flex-col items-center justify-center gap-4 px-6" dir="rtl">
        <AlertCircle className="w-12 h-12 text-destructive" />
        <p className="text-destructive text-sm text-center">{error || "باشگاه یافت نشد"}</p>
        <button onClick={() => router.push("/gyms")} className="hevy-btn-primary px-6 py-2.5 text-sm">
          بازگشت به باشگاه‌ها
        </button>
      </div>
    );
  }

  const days = getNext7Days();
  const selectedSlotData = timeSlots.find(s => s.id === selectedSlot);
  const canAfford = walletBalance >= gym.price_per_session;
  const coverPhoto = gym.photos.length > 0 ? gym.photos[0].url : null;

  return (
    <motion.div
      className="min-h-screen gradient-mesh pb-32"
      dir="rtl"
      variants={containerV}
      initial="hidden"
      animate="visible"
    >
      {/* ── Header ── */}
      <div className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 pt-12 pb-3 bg-gradient-to-b from-black/80 to-transparent">
        <button onClick={() => router.back()} className="w-10 h-10 rounded-xl glass-card flex items-center justify-center">
          <ArrowRight className="w-5 h-5 text-foreground" />
        </button>
        <div className="flex items-center gap-2">
          <button onClick={() => setIsFav(!isFav)} className="w-10 h-10 rounded-xl glass-card flex items-center justify-center">
            <Heart className={`w-5 h-5 ${isFav ? "text-destructive fill-destructive" : "text-foreground"}`} />
          </button>
          <button className="w-10 h-10 rounded-xl glass-card flex items-center justify-center">
            <Share2 className="w-5 h-5 text-foreground" />
          </button>
        </div>
      </div>

      {/* ── Photo Gallery ── */}
      <motion.div variants={itemV} className="relative w-full h-56 bg-hevy-elevated">
        {coverPhoto ? (
          <img src={coverPhoto} alt={gym.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Dumbbell className="w-16 h-16 text-foreground/10" />
          </div>
        )}
        {gym.photos.length > 1 && (
          <>
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
              {gym.photos.slice(0, 5).map((_, i) => (
                <div key={i} className={`w-1.5 h-1.5 rounded-full transition-all ${i === currentPhoto ? "bg-white w-4" : "bg-white/40"}`} />
              ))}
            </div>
            <div className="absolute bottom-3 right-3 bg-background/50 backdrop-blur-sm rounded-lg px-2.5 py-1 text-[10px] text-foreground/70">
              ۱/{gym.photos.length} عکس
            </div>
          </>
        )}
      </motion.div>

      {/* ── Gym Info ── */}
      <motion.div variants={itemV} className="px-4 -mt-6 relative z-10">
        <div className="glass-card p-4 rounded-2xl">
          <h1 className="text-xl font-bold text-foreground">{gym.name}</h1>
          <div className="flex items-center gap-3 mt-2">
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 text-warning fill-warning" />
              <span className="text-sm font-bold text-foreground">{gym.avg_rating.toFixed(1)}</span>
              <span className="text-[11px] text-foreground/30">({gym.review_count} نظر)</span>
            </div>
            {gym.area && (
              <span className="text-[11px] text-foreground/40">• {gym.area}</span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-2.5 text-foreground/40">
            <MapPin className="w-3.5 h-3.5 shrink-0" />
            <span className="text-xs truncate">{gym.address}</span>
          </div>
          <div className="flex items-center gap-2 mt-1.5 text-foreground/40">
            <Clock className="w-3.5 h-3.5 shrink-0" />
            <span className="text-xs">{gym.open_time} تا {gym.close_time}</span>
          </div>
        </div>
      </motion.div>

      {/* ── Sport Types ── */}
      {gym.sport_types.length > 0 && (
        <motion.div variants={itemV} className="px-4 mt-4">
          <div className="flex flex-wrap gap-2">
            {gym.sport_types.map(st => (
              <span key={st} className="px-3 py-1.5 rounded-xl bg-primary/10 border border-primary/20 text-[11px] font-medium text-primary">
                {PERSIAN_SPORTS[st] || st}
              </span>
            ))}
          </div>
        </motion.div>
      )}

      {/* ── Amenities ── */}
      {gym.amenities.length > 0 && (
        <motion.div variants={itemV} className="px-4 mt-5">
          <h3 className="text-sm font-bold text-foreground/60 mb-3">امکانات</h3>
          <div className="grid grid-cols-3 gap-2">
            {gym.amenities.map(am => (
              <div key={am} className="bento-cell p-2.5 flex items-center justify-center text-center">
                <span className="text-[10px] text-foreground/60">{PERSIAN_AMENITIES[am] || am}</span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* ── Contact ── */}
      <motion.div variants={itemV} className="px-4 mt-5">
        <h3 className="text-sm font-bold text-foreground/60 mb-3">اطلاعات تماس</h3>
        <div className="glass-card overflow-hidden divide-y divide-white/5">
          {gym.phone && (
            <a href={`tel:${gym.phone}`} className="flex items-center gap-3 px-4 py-3 active:bg-white/5">
              <Phone className="w-4 h-4 text-success" />
              <span className="text-sm text-foreground/70 flex-1" dir="ltr">{gym.phone}</span>
              <ChevronLeft className="w-4 h-4 text-foreground/15" />
            </a>
          )}
          {gym.instagram && (
            <a href={`https://instagram.com/${gym.instagram.replace("@", "")}`} target="_blank" className="flex items-center gap-3 px-4 py-3 active:bg-white/5">
              <Camera className="w-4 h-4 text-chart-purple" />
              <span className="text-sm text-foreground/70 flex-1" dir="ltr">{gym.instagram}</span>
              <ChevronLeft className="w-4 h-4 text-foreground/15" />
            </a>
          )}
          {gym.website && (
            <a href={gym.website} target="_blank" className="flex items-center gap-3 px-4 py-3 active:bg-white/5">
              <Globe className="w-4 h-4 text-primary" />
              <span className="text-sm text-foreground/70 flex-1" dir="ltr">{gym.website}</span>
              <ChevronLeft className="w-4 h-4 text-foreground/15" />
            </a>
          )}
        </div>
      </motion.div>

      {/* ── Time Slot Booking ── */}
      <motion.div variants={itemV} className="px-4 mt-6">
        <h3 className="text-sm font-bold text-foreground/60 mb-3">رزرو جلسه</h3>

        {/* Date Selector */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {days.map(day => (
            <button
              key={day.value}
              onClick={() => setSelectedDate(day.value)}
              className={`shrink-0 rounded-2xl px-4 py-3 text-center transition-all haptic-ready ${
                selectedDate === day.value
                  ? "bg-primary shadow-lg shadow-primary/25"
                  : "glass-card"
              }`}
            >
              <p className={`text-[10px] ${selectedDate === day.value ? "text-foreground/70" : "text-foreground/30"}`}>{day.dayName}</p>
              <p className={`text-sm font-bold mt-0.5 ${selectedDate === day.value ? "text-foreground" : "text-foreground/50"}`}>{day.label}</p>
            </button>
          ))}
        </div>

        {/* Time Slots */}
        <div className="mt-3">
          {loadingSlots ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : timeSlots.length === 0 ? (
            <div className="glass-card p-6 text-center">
              <Clock className="w-8 h-8 text-foreground/10 mx-auto mb-2" />
              <p className="text-sm text-foreground/30">اسلات زمانی موجود نیست</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {timeSlots.map(slot => {
                const spotsLeft = slot.capacity - slot.booked_count;
                const isSelected = selectedSlot === slot.id;
                return (
                  <button
                    key={slot.id}
                    onClick={() => slot.is_available ? setSelectedSlot(slot.id) : undefined}
                    disabled={!slot.is_available}
                    className={`relative rounded-2xl p-3 text-center transition-all haptic-ready ${
                      !slot.is_available
                        ? "bg-white/5 opacity-40"
                        : isSelected
                          ? "bg-success/15 border-2 border-success/40 shadow-lg shadow-success/10"
                          : "glass-card hover:border-white/10"
                    }`}
                  >
                    <p className="text-xs font-bold text-foreground" dir="ltr">{slot.start_time} - {slot.end_time}</p>
                    {slot.is_available ? (
                      <p className={`text-[9px] mt-1 ${spotsLeft <= 2 ? "text-warning" : "text-foreground/30"}`}>
                        {spotsLeft <= 2 ? `${spotsLeft} جا مانده` : `${spotsLeft} جا خالی`}
                      </p>
                    ) : (
                      <p className="text-[9px] mt-1 text-destructive">ظرفیت تکمیل</p>
                    )}
                    {isSelected && (
                      <motion.div
                        layoutId="slotCheck"
                        className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-success flex items-center justify-center"
                      >
                        <Check className="w-3 h-3 text-foreground" />
                      </motion.div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </motion.div>

      {/* ── Trainers ── */}
      {gym.trainers.length > 0 && (
        <motion.div variants={itemV} className="px-4 mt-6">
          <h3 className="text-sm font-bold text-foreground/60 mb-3">مربی‌ها</h3>
          <div className="space-y-2">
            {gym.trainers.map((trainer, i) => (
              <div key={i} className="glass-card p-3.5 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-chart-purple/20 to-primary/20 flex items-center justify-center shrink-0">
                  {trainer.photo_url ? (
                    <img src={trainer.photo_url} alt={trainer.name} className="w-full h-full rounded-xl object-cover" />
                  ) : (
                    <User className="w-5 h-5 text-chart-purple" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{trainer.name}</p>
                  {trainer.specialty && <p className="text-[10px] text-foreground/30 mt-0.5">{trainer.specialty}</p>}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* ── Reviews ── */}
      {gym.reviews.length > 0 && (
        <motion.div variants={itemV} className="px-4 mt-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-foreground/60">نظرات کاربران</h3>
            <span className="text-[11px] text-primary">{gym.review_count} نظر</span>
          </div>
          <div className="space-y-2">
            {gym.reviews.slice(0, 5).map((review, i) => (
              <div key={i} className="glass-card p-3.5">
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map(s => (
                      <Star key={s} className={`w-3 h-3 ${s <= review.rating ? "text-warning fill-warning" : "text-foreground/10"}`} />
                    ))}
                  </div>
                  <span className="text-[10px] text-foreground/30">
                    {review.athlete_name || "کاربر"} · {formatDatePersian(review.created_at)}
                  </span>
                </div>
                {review.comment && <p className="text-xs text-foreground/50 leading-relaxed">{review.comment}</p>}
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* ── Description ── */}
      {gym.description && (
        <motion.div variants={itemV} className="px-4 mt-6">
          <h3 className="text-sm font-bold text-foreground/60 mb-2">درباره باشگاه</h3>
          <p className="text-xs text-foreground/40 leading-relaxed">{gym.description}</p>
        </motion.div>
      )}

      {/* ── Sticky Bottom Bar ── */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-xl border-t border-white/5 px-4 py-3">
        <div className="flex items-center gap-4 max-w-md mx-auto">
          <div className="flex-1 min-w-0">
            <p className="text-lg font-bold text-foreground">{formatPrice(BigInt(gym.price_per_session))}</p>
            <p className="text-[10px] text-foreground/30">به ازای هر جلسه</p>
          </div>
          <button
            onClick={() => {
              if (!selectedSlot) return;
              setShowBookingModal(true);
            }}
            disabled={!selectedSlot}
            className="px-6 py-3.5 rounded-2xl bg-primary text-foreground text-sm font-bold disabled:opacity-30 haptic-ready shadow-lg shadow-primary/25 flex items-center gap-2"
          >
            {selectedSlot ? "رزرو و پرداخت" : "زمان را انتخاب کنید"}
          </button>
        </div>
      </div>

      {/* ── Booking Confirmation Modal ── */}
      <AnimatePresence>
        {showBookingModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] hevy-overlay flex items-end justify-center"
            onClick={() => { if (!isBooking) { setShowBookingModal(false); setBookingResult(null); } }}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-md rounded-t-3xl bg-background border-t border-white/10 p-6"
            >
              <div className="w-10 h-1 rounded-full bg-white/10 mx-auto mb-5" />

              {!bookingResult ? (
                <>
                  <h3 className="text-lg font-bold text-foreground mb-5">تأیید رزرو</h3>

                  {/* Gym & Slot Info */}
                  <div className="glass-card p-4 mb-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
                        <Dumbbell className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-foreground">{gym.name}</p>
                        <p className="text-[10px] text-foreground/30">{formatDatePersian(selectedDate)}</p>
                      </div>
                    </div>
                    {selectedSlotData && (
                      <div className="flex items-center gap-2 text-foreground/40">
                        <Clock className="w-3.5 h-3.5" />
                        <span className="text-xs" dir="ltr">{selectedSlotData.start_time} - {selectedSlotData.end_time}</span>
                      </div>
                    )}
                  </div>

                  {/* Price Breakdown */}
                  <div className="space-y-2 mb-5">
                    <div className="flex justify-between text-sm">
                      <span className="text-foreground/40">قیمت جلسه</span>
                      <span className="text-foreground">{formatPrice(BigInt(gym.price_per_session))}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-foreground/40">موجودی کیف پول</span>
                      <span className={canAfford ? "text-success" : "text-destructive"}>{formatPrice(BigInt(walletBalance))}</span>
                    </div>
                    {canAfford && (
                      <div className="flex justify-between text-sm pt-2 border-t border-white/5">
                        <span className="text-foreground/40">مانده بعد از رزرو</span>
                        <span className="text-foreground">{formatPrice(BigInt(walletBalance - gym.price_per_session))}</span>
                      </div>
                    )}
                  </div>

                  {!canAfford && (
                    <div className="bg-destructive/10 border border-destructive/20 rounded-2xl p-3 mb-4 flex items-center gap-2">
                      <Wallet className="w-5 h-5 text-destructive shrink-0" />
                      <div>
                        <p className="text-xs text-destructive">موجودی کافی نیست</p>
                        <p className="text-[10px] text-foreground/30 mt-0.5">
                          {formatPrice(BigInt(gym.price_per_session - walletBalance))} دیگر شارژ کنید
                        </p>
                      </div>
                    </div>
                  )}

                  <button
                    onClick={handleBooking}
                    disabled={isBooking || !canAfford}
                    className="w-full py-3.5 rounded-2xl bg-primary text-foreground font-bold disabled:opacity-40 haptic-ready shadow-lg shadow-primary/25 flex items-center justify-center gap-2"
                  >
                    {isBooking ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        در حال رزرو...
                      </>
                    ) : (
                      <>
                        <Shield className="w-4 h-4" />
                        تأیید و پرداخت از کیف پول
                      </>
                    )}
                  </button>
                </>
              ) : bookingResult.success ? (
                /* ── Success State ── */
                <div className="text-center py-4">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", damping: 15 }}
                    className="w-16 h-16 rounded-full bg-success/15 flex items-center justify-center mx-auto mb-4"
                  >
                    <Check className="w-8 h-8 text-success" />
                  </motion.div>
                  <h3 className="text-lg font-bold text-foreground mb-1">رزرو موفق!</h3>
                  <p className="text-sm text-foreground/40 mb-5">{bookingResult.data?.gymName}</p>

                  {/* Ticket */}
                  <div className="bg-hevy-elevated rounded-2xl p-4 mb-5 border border-dashed border-white/10">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[10px] text-foreground/30">کد ورود</span>
                      <span className="text-[10px] text-foreground/30">{formatDatePersian(bookingResult.data?.date)}</span>
                    </div>
                    <p className="text-2xl font-bold text-primary tracking-[0.3em] text-center my-3" dir="ltr">
                      {bookingResult.data?.checkInCode}
                    </p>
                    <div className="flex items-center justify-center gap-2 text-foreground/30">
                      <Clock className="w-3 h-3" />
                      <span className="text-xs" dir="ltr">{bookingResult.data?.startTime} - {bookingResult.data?.endTime}</span>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => router.push("/bookings")}
                      className="flex-1 py-3 rounded-2xl bg-primary text-foreground text-sm font-bold haptic-ready"
                    >
                      مشاهده رزروها
                    </button>
                    <button
                      onClick={() => { setShowBookingModal(false); setBookingResult(null); }}
                      className="flex-1 py-3 rounded-2xl glass-card text-foreground/70 text-sm font-bold"
                    >
                      بستن
                    </button>
                  </div>
                </div>
              ) : (
                /* ── Error State ── */
                <div className="text-center py-4">
                  <div className="w-16 h-16 rounded-full bg-destructive/15 flex items-center justify-center mx-auto mb-4">
                    <AlertCircle className="w-8 h-8 text-destructive" />
                  </div>
                  <h3 className="text-lg font-bold text-foreground mb-2">خطا در رزرو</h3>
                  <p className="text-sm text-foreground/40 mb-5">{bookingResult.error}</p>
                  <button
                    onClick={() => setBookingResult(null)}
                    className="w-full py-3.5 rounded-2xl glass-card text-foreground/70 font-bold"
                  >
                    تلاش مجدد
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}