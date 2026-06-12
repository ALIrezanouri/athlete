"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "motion/react";
import {
  Search,
  MapPin,
  Star,
  SlidersHorizontal,
  X,
  ArrowRight,
  Clock,
  Dumbbell,
  ChevronDown,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { getGyms, getSportTypes } from "@/app/actions/gyms";
import { useGlobalEngine } from "@/lib/GlobalEngineContext";

// ── Types ──
interface GymItem {
  id: string;
  name: string;
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
  primary_photo_url: string | null;
  sport_types: string[];
  amenities: string[];
}

type SortOption = "rating" | "price";

// ── Animation ──
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05, delayChildren: 0.1 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] as const } },
};

// ── Sport Type Labels ──
const SPORT_LABELS: Record<string, string> = {
  bodybuilding: "بدنسازی",
  powerlifting: "پاورلیفتینگ",
  crossfit: "کراسفیت",
  yoga: "یوگا",
  pilates: "پیلاتس",
  swimming: "شنا",
  boxing: "بوکس",
  martial_arts: "هنرهای رزمی",
  spinning: "اسپینینگ",
  functional: "فانکشنال",
  olympic_weightlifting: "وزنه‌برداری المپیک",
  calisthenics: "کالیستنیکس",
};

// ── Main Component ──
export default function GymsDiscoveryPage() {
  const { formatPrice } = useGlobalEngine();

  // Data
  const [gyms, setGyms] = useState<GymItem[]>([]);
  const [sportTypes, setSportTypes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSport, setSelectedSport] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>("rating");
  const [showFilters, setShowFilters] = useState(false);

  // Fetch sport types once
  useEffect(() => {
    async function fetchSports() {
      const res = await getSportTypes();
      if (res.success && res.data) setSportTypes(res.data);
    }
    fetchSports();
  }, []);

  // Fetch gyms when filters change
  const fetchGyms = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getGyms({
        search: searchQuery || undefined,
        sportType: selectedSport || undefined,
        sortBy,
      });
      if (res.success && res.data) {
        setGyms(res.data);
      }
    } catch (err) {
      console.error("Error fetching gyms:", err);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, selectedSport, sortBy]);

  useEffect(() => {
    const timer = setTimeout(fetchGyms, 300); // debounce search
    return () => clearTimeout(timer);
  }, [fetchGyms]);

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedSport(null);
    setSortBy("rating");
  };

  const hasActiveFilters = searchQuery || selectedSport;

  return (
    <motion.div
      className="min-h-screen gradient-mesh pb-28"
      dir="rtl"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* ── Header ── */}
      <motion.div variants={itemVariants} className="px-4 pt-14 pb-2">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-2xl font-bold text-foreground">باشگاه‌ها</h1>
          <span className="text-xs text-foreground/30">
            {gyms.length > 0 ? `${gyms.length.toLocaleString("fa-IR")} باشگاه` : ""}
          </span>
        </div>
        <p className="text-sm text-foreground/40">بهترین باشگاه‌ها رو پیدا کن و رزرو کن</p>
      </motion.div>

      {/* ── Search Bar ── */}
      <motion.div variants={itemVariants} className="px-4 mt-3">
        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/25" />
            <input
              type="text"
              placeholder="جستجوی باشگاه..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-hevy-elevated border border-white/8 rounded-xl pr-10 pl-4 py-3 text-foreground text-sm placeholder:text-foreground/20 focus:border-primary focus:outline-none transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-white/10 flex items-center justify-center"
              >
                <X className="w-3 h-3 text-foreground/40" />
              </button>
            )}
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
              showFilters || hasActiveFilters
                ? "bg-primary text-foreground"
                : "bg-hevy-elevated border border-white/8 text-foreground/40"
            }`}
          >
            <SlidersHorizontal className="w-4.5 h-4.5" />
          </button>
        </div>
      </motion.div>

      {/* ── Filter Panel ── */}
      {showFilters && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="px-4 mt-3 overflow-hidden"
        >
          <div className="glass-card p-4 space-y-4">
            {/* Sort */}
            <div>
              <span className="text-xs font-semibold text-foreground/50 mb-2 block">ترتیب نمایش</span>
              <div className="flex gap-2">
                {[
                  { value: "rating" as SortOption, label: "محبوب‌ترین" },
                  { value: "price" as SortOption, label: "ارزان‌ترین" },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setSortBy(opt.value)}
                    className={`px-4 py-2 rounded-xl text-xs font-medium transition-all ${
                      sortBy === opt.value
                        ? "bg-primary text-foreground shadow-lg shadow-primary/20"
                        : "bg-white/5 text-foreground/40 border border-white/8"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Sport Types */}
            {sportTypes.length > 0 && (
              <div>
                <span className="text-xs font-semibold text-foreground/50 mb-2 block">نوع ورزش</span>
                <div className="flex flex-wrap gap-2">
                  {sportTypes.map((sport) => (
                    <button
                      key={sport}
                      onClick={() => setSelectedSport(selectedSport === sport ? null : sport)}
                      className={`px-3 py-1.5 rounded-xl text-[11px] font-medium transition-all ${
                        selectedSport === sport
                          ? "bg-primary text-foreground shadow-lg shadow-primary/20"
                          : "bg-white/5 text-foreground/40 border border-white/8"
                      }`}
                    >
                      {SPORT_LABELS[sport] || sport}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Clear Filters */}
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="text-xs text-destructive font-medium"
              >
                حذف فیلترها
              </button>
            )}
          </div>
        </motion.div>
      )}

      {/* ── Active Filter Chips ── */}
      {hasActiveFilters && !showFilters && (
        <motion.div variants={itemVariants} className="px-4 mt-3 flex gap-2 flex-wrap">
          {selectedSport && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/15 border border-primary/20 text-[11px] text-primary font-medium">
              {SPORT_LABELS[selectedSport] || selectedSport}
              <button onClick={() => setSelectedSport(null)}>
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {searchQuery && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-[11px] text-foreground/50 font-medium">
              «{searchQuery}»
              <button onClick={() => setSearchQuery("")}>
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
        </motion.div>
      )}

      {/* ── Gym List ── */}
      <motion.div variants={itemVariants} className="px-4 mt-4 space-y-3">
        {loading ? (
          // Skeleton
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="glass-card p-4 animate-pulse">
              <div className="flex gap-3">
                <div className="w-20 h-20 rounded-xl bg-white/5 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-white/5 rounded w-3/4" />
                  <div className="h-3 bg-white/5 rounded w-1/2" />
                  <div className="h-3 bg-white/5 rounded w-1/3" />
                </div>
              </div>
            </div>
          ))
        ) : gyms.length === 0 ? (
          // Empty State
          <div className="glass-card p-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Dumbbell className="w-8 h-8 text-primary/30" />
            </div>
            <p className="text-sm text-foreground/30 font-medium">باشگاهی یافت نشد</p>
            <p className="text-xs text-foreground/20 mt-1">فیلترها رو تغییر بده یا عبارت جستجو رو اصلاح کن</p>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="mt-4 px-4 py-2 rounded-xl bg-primary/10 text-primary text-xs font-medium"
              >
                حذف فیلترها
              </button>
            )}
          </div>
        ) : (
          // Gym Cards
          gyms.map((gym) => (
            <Link key={gym.id} href={`/gyms/${gym.id}`}>
              <div className="glass-card overflow-hidden haptic-ready group">
                {/* Gym Image Placeholder */}
                <div className="relative h-36 bg-gradient-to-br from-primary/10 via-hevy-elevated to-background overflow-hidden">
                  {gym.primary_photo_url ? (
                    <img
                      src={gym.primary_photo_url}
                      alt={gym.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Dumbbell className="w-12 h-12 text-foreground/5" />
                    </div>
                  )}
                  {/* Price Badge */}
                  <div className="absolute bottom-2 left-2 px-2.5 py-1 rounded-lg bg-background/80 backdrop-blur-sm border border-white/10">
                    <span className="text-xs font-bold text-foreground">
                      {formatPrice(BigInt(gym.price_per_session))}
                    </span>
                    <span className="text-[9px] text-foreground/40 mr-1">/جلسه</span>
                  </div>
                  {/* Rating Badge */}
                  {gym.avg_rating > 0 && (
                    <div className="absolute top-2 left-2 px-2 py-1 rounded-lg bg-background/80 backdrop-blur-sm border border-white/10 flex items-center gap-1">
                      <Star className="w-3 h-3 text-warning fill-warning" />
                      <span className="text-[11px] font-bold text-foreground">{gym.avg_rating.toFixed(1)}</span>
                    </div>
                  )}
                </div>

                {/* Gym Info */}
                <div className="p-3.5">
                  <h3 className="text-sm font-bold text-foreground truncate">{gym.name}</h3>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <MapPin className="w-3 h-3 text-foreground/20 shrink-0" />
                    <span className="text-[11px] text-foreground/35 truncate">{gym.address}</span>
                  </div>
                  <div className="flex items-center justify-between mt-2.5">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3 h-3 text-foreground/20" />
                      <span className="text-[10px] text-foreground/30">
                        {gym.open_time} – {gym.close_time}
                      </span>
                    </div>
                    {gym.sport_types.length > 0 && (
                      <div className="flex gap-1">
                        {gym.sport_types.slice(0, 2).map((st) => (
                          <span
                            key={st}
                            className="px-2 py-0.5 rounded-md bg-primary/8 text-[9px] text-primary/60 font-medium"
                          >
                            {SPORT_LABELS[st] || st}
                          </span>
                        ))}
                        {gym.sport_types.length > 2 && (
                          <span className="px-1.5 py-0.5 rounded-md bg-white/5 text-[9px] text-foreground/25">
                            +{gym.sport_types.length - 2}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          ))
        )}
      </motion.div>

      {/* ── CTA Banner ── */}
      {!loading && gyms.length > 0 && (
        <motion.div variants={itemVariants} className="px-4 mt-6">
          <div className="relative overflow-hidden rounded-2xl p-5 bg-gradient-to-l from-chart-purple/20 via-primary/10 to-transparent border border-chart-purple/15">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-chart-purple/20 flex items-center justify-center shrink-0">
                <Sparkles className="w-6 h-6 text-chart-purple" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-foreground">باشگاهت رو نمی‌بینی؟</p>
                <p className="text-[10px] text-foreground/35 mt-0.5">با ما تماس بگیر تا اضافه بشه</p>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}