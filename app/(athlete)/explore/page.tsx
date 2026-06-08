"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useGlobalEngine } from "@/lib/GlobalEngineContext"
import { motion, AnimatePresence } from "motion/react"
import {
  Search,
  SlidersHorizontal,
  Star,
  MapPin,
  Clock,
  ChevronDown,
  X,
  Dumbbell,
  Flame,
  Swords,
  Waves,
  Bike,
  Heart,
  Loader2,
  RefreshCw,
  Flower2,
  Users,
  UserPlus,
  UserCheck,
} from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { MobileDrawer } from "@/components/ui/mobile-drawer"
import { getGyms } from "@/app/actions/gyms"
import { searchUsers, getSuggestedUsers, followUser, unfollowUser, isFollowing } from "@/app/actions/social"

// ─── UI Config Constants (not mock data — these are display labels) ───
const SPORT_TYPES = [
  { key: "bodybuilding", labelEn: "Bodybuilding", labelFa: "بدنسازی" },
  { key: "crossfit", labelEn: "CrossFit", labelFa: "کراسفیت" },
  { key: "boxing", labelEn: "Boxing", labelFa: "بوکس" },
  { key: "swimming", labelEn: "Swimming", labelFa: "شنا" },
  { key: "yoga", labelEn: "Yoga", labelFa: "یوگا" },
  { key: "fitness", labelEn: "Fitness", labelFa: "فیتنس" },
]

// ─── Types ──────────────────────────────────────────────────────────
interface GymData {
  id: string
  name: string
  address: string
  city: string
  area: string | null
  avg_rating: number
  review_count: number
  price_per_session: number
  open_time: string
  close_time: string
  latitude: number | null
  longitude: number | null
  phone: string | null
  instagram: string | null
  website: string | null
  primary_photo_url: string | null
  sport_types: string[]
  amenities: string[]
}

type SortOption = "nearest" | "cheapest" | "highest_rated" | "most_popular"

// ─── Animation Variants ─────────────────────────────────────────────
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.1 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: "easeOut" as const },
  },
}

// ─── Sport Icon Mapper ──────────────────────────────────────────────
function getSportIcon(sportKey: string) {
  switch (sportKey) {
    case "bodybuilding":
    case "weightlifting":
    case "weight_training":
      return Dumbbell
    case "crossfit":
    case "fitness":
    case "cardio":
      return Flame
    case "boxing":
    case "kickboxing":
    case "mma":
      return Swords
    case "swimming":
      return Waves
    case "cycling":
      return Bike
    case "yoga":
    case "pilates":
      return Flower2
    default:
      return Dumbbell
  }
}

// ─── Helpers ────────────────────────────────────────────────────────

/** Compute whether a gym is currently open based on Iran timezone */
function isGymOpen(openTime: string, closeTime: string): boolean {
  try {
    // Get current time in Iran timezone (Asia/Tehran)
    const now = new Date()
    const iranOffset = 3.5 * 60 // Iran is UTC+3:30
    const utcMs = now.getTime() + now.getTimezoneOffset() * 60000
    const iranMs = utcMs + iranOffset * 60000
    const iranTime = new Date(iranMs)

    const currentMinutes = iranTime.getHours() * 60 + iranTime.getMinutes()

    // Parse DB time strings (format: "HH:MM:SS" or "HH:MM")
    const parseTime = (t: string) => {
      const parts = t.split(":")
      return parseInt(parts[0]) * 60 + parseInt(parts[1])
    }

    const openMinutes = parseTime(openTime)
    const closeMinutes = parseTime(closeTime)

    // Handle overnight hours (e.g., open 06:00, close 23:30 — normal case)
    if (closeMinutes > openMinutes) {
      return currentMinutes >= openMinutes && currentMinutes < closeMinutes
    }

    // Handle overnight gyms (e.g., open 22:00, close 06:00 — rare case)
    return currentMinutes >= openMinutes || currentMinutes < closeMinutes
  } catch {
    return false
  }
}

/** Haversine distance between two lat/lon points (returns km) */
function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371 // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

// ─── Skeleton Card Component ────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="glass rounded-2xl overflow-hidden">
      <div className="h-36 bg-gradient-to-br from-white/5 to-white/3 animate-pulse" />
      <div className="p-4 space-y-3">
        <div className="h-4 w-3/4 bg-white/5 rounded animate-pulse" />
        <div className="h-3 w-1/2 bg-white/5 rounded animate-pulse" />
        <div className="flex justify-between pt-3 border-t border-white/5">
          <div className="h-3 w-16 bg-white/5 rounded animate-pulse" />
          <div className="h-4 w-24 bg-white/5 rounded animate-pulse" />
        </div>
      </div>
    </div>
  )
}

// ─── Main Explore Page ──────────────────────────────────────────────
export default function ExplorePage() {
  const { t, formatPrice } = useGlobalEngine()

  // State: tabs
  const [activeTab, setActiveTab] = useState<"gyms" | "people">("gyms")

  // State: people
  const [peopleSearch, setPeopleSearch] = useState("")
  const [searchResults, setSearchResults] = useState<Array<any>>([])
  const [suggestedUsers, setSuggestedUsers] = useState<Array<any>>([])
  const [followStates, setFollowStates] = useState<Record<string, boolean>>({})
  const [peopleLoading, setPeopleLoading] = useState(false)
  const [suggestedLoading, setSuggestedLoading] = useState(true)
  const peopleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // State: filters
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedSport, setSelectedSport] = useState<string | null>(null)
  const [sortOption, setSortOption] = useState<SortOption>("highest_rated")
  const [showSortMenu, setShowSortMenu] = useState(false)

  // State: data
  const [gyms, setGyms] = useState<GymData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // State: user location for distance computation
  const [userLocation, setUserLocation] = useState<{ lat: number; lon: number } | null>(null)

  // State: local favorites (client-side only until backend API exists)
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set())

  // Debounce timer ref for search
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Fetch gyms from server action ──
  const fetchGyms = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      // Map sort option to server action sortBy
      let sortBy: "rating" | "price" | "distance" | undefined
      switch (sortOption) {
        case "cheapest":
          sortBy = "price"
          break
        case "highest_rated":
        case "most_popular":
          sortBy = "rating"
          break
        default:
          sortBy = "rating"
          break
      }

      const result = await getGyms({
        sportType: selectedSport ?? undefined,
        search: searchQuery.trim() || undefined,
        sortBy,
      })

      if (!result.success) {
        setError(result.error ?? "Failed to load gyms")
        return
      }

      setGyms(result.data ?? [])
    } catch (err) {
      console.error("[EXPLORE] Error fetching gyms:", err)
      setError("An unexpected error occurred")
    } finally {
      setLoading(false)
    }
  }, [selectedSport, searchQuery, sortOption])

  // ── Fetch gyms on mount and when filters change ──
  useEffect(() => {
    // Debounce search queries (300ms), but immediate for sport/sort changes
    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current)
    }

    // Only debounce if it's a search query change (not initial load or filter change)
    const delay = searchQuery.trim().length > 0 ? 300 : 0

    searchTimerRef.current = setTimeout(() => {
      fetchGyms()
    }, delay)

    return () => {
      if (searchTimerRef.current) {
        clearTimeout(searchTimerRef.current)
      }
    }
  }, [fetchGyms])

  // ── Try to get user location for distance computation ──
  useEffect(() => {
    if (typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation({
            lat: pos.coords.latitude,
            lon: pos.coords.longitude,
          })
        },
        () => {
          // Location unavailable — distance will not be shown
          setUserLocation(null)
        },
        { enableHighAccuracy: false, timeout: 5000 }
      )
    }
  }, [])

  // ── Load suggested users on mount ──
  useEffect(() => {
    async function loadSuggested() {
      setSuggestedLoading(true)
      const res = await getSuggestedUsers(10)
      if (res.data) setSuggestedUsers(res.data)
      setSuggestedLoading(false)
    }
    loadSuggested()
  }, [])

  // ── People search with debounce ──
  useEffect(() => {
    if (!peopleSearch.trim()) {
      setSearchResults([])
      return
    }
    if (peopleTimerRef.current) clearTimeout(peopleTimerRef.current)
    peopleTimerRef.current = setTimeout(async () => {
      setPeopleLoading(true)
      const res = await searchUsers(peopleSearch)
      if (res.data) setSearchResults(res.data)
      setPeopleLoading(false)
    }, 300)
    return () => { if (peopleTimerRef.current) clearTimeout(peopleTimerRef.current) }
  }, [peopleSearch])

  // ── Toggle follow for a user ──
  async function toggleFollowUser(userId: string) {
    const currentlyFollowing = followStates[userId]
    setFollowStates(prev => ({ ...prev, [userId]: !currentlyFollowing }))

    if (currentlyFollowing) {
      const res = await unfollowUser(userId)
      if (!res.success) setFollowStates(prev => ({ ...prev, [userId]: true }))
    } else {
      const res = await followUser(userId)
      if (!res.success) setFollowStates(prev => ({ ...prev, [userId]: false }))
    }
  }

  // ── User card component ──
  function UserCard({ user }: { user: any }) {
    const uid = user.id
    const isFollowed = followStates[uid]
    return (
      <Link href={`/profile/${uid}`}>
        <motion.div
          className="glass rounded-2xl p-4 flex items-center gap-3"
          whileTap={{ scale: 0.98 }}
        >
          <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold shrink-0">
            {user.full_name?.charAt(0) || "?"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{user.full_name || "کاربر"}</p>
            {user.bio && <p className="text-xs text-foreground/30 truncate mt-0.5">{user.bio}</p>}
            <div className="flex gap-3 mt-1 text-[10px] text-foreground/25">
              <span>{user.follower_count ?? 0} دنبال‌کننده</span>
              <span>{user.workout_count ?? 0} تمرین</span>
            </div>
          </div>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleFollowUser(uid) }}
            className={`shrink-0 p-2 rounded-full transition-all ${
              isFollowed
                ? "bg-white/10 text-foreground/50"
                : "bg-primary text-foreground"
            }`}
          >
            {isFollowed ? <UserCheck className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
          </motion.button>
        </motion.div>
      </Link>
    )
  }

  // ── Compute derived data for each gym ──
  const enrichedGyms = gyms.map((gym) => {
    const isOpen = isGymOpen(gym.open_time, gym.close_time)
    const distance =
      userLocation && gym.latitude && gym.longitude
        ? haversineDistance(userLocation.lat, userLocation.lon, gym.latitude, gym.longitude)
        : null

    return { ...gym, isOpen, distance }
  })

  // ── Client-side sort for "nearest" (needs user location) and "most_popular" ──
  const sortedGyms = [...enrichedGyms].sort((a, b) => {
    switch (sortOption) {
      case "nearest":
        // Sort by distance; gyms without distance go to the end
        if (a.distance === null && b.distance === null) return 0
        if (a.distance === null) return 1
        if (b.distance === null) return -1
        return a.distance - b.distance
      case "most_popular":
        return b.review_count - a.review_count
      // "cheapest" and "highest_rated" are handled server-side
      default:
        return 0
    }
  })

  const sortOptions: { key: SortOption; label: string }[] = [
    { key: "nearest", label: t("explore.sortNearest") },
    { key: "cheapest", label: t("explore.sortCheapest") },
    { key: "highest_rated", label: t("explore.sortHighestRated") },
    { key: "most_popular", label: t("explore.sortMostPopular") },
  ]

  return (
    <motion.div
      className="px-4 pt-14 pb-4 space-y-4"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header + Tabs */}
      <motion.div variants={itemVariants}>
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-2xl font-bold text-foreground">
            {t("explore.title")}
          </h1>
        </div>
        {/* Tab Switcher */}
        <div className="flex gap-1 p-1 glass rounded-2xl">
          <button
            onClick={() => setActiveTab("gyms")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all ${
              activeTab === "gyms"
                ? "bg-primary text-foreground shadow-lg shadow-primary/20"
                : "text-foreground/40 hover:text-foreground/60"
            }`}
          >
            <Dumbbell className="w-4 h-4" />
            باشگاه‌ها
          </button>
          <button
            onClick={() => setActiveTab("people")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all ${
              activeTab === "people"
                ? "bg-primary text-foreground shadow-lg shadow-primary/20"
                : "text-foreground/40 hover:text-foreground/60"
            }`}
          >
            <Users className="w-4 h-4" />
            ورزشکاران
          </button>
        </div>
      </motion.div>

      {/* ───── PEOPLE TAB ───── */}
      {activeTab === "people" && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {/* People Search Bar */}
          <div className="glass rounded-2xl flex items-center gap-3 px-4 py-3">
            <Search className="w-5 h-5 text-foreground/30 shrink-0" />
            <input
              type="text"
              value={peopleSearch}
              onChange={(e) => setPeopleSearch(e.target.value)}
              placeholder="جستجوی ورزشکار..."
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-foreground/30 outline-none"
            />
            {peopleSearch && (
              <button onClick={() => setPeopleSearch("")} className="text-foreground/30 hover:text-foreground/60">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Search Results */}
          {peopleSearch.trim() ? (
            <>
              {peopleLoading ? (
                <div className="flex justify-center py-12">
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : searchResults.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-3xl mb-2">🔍</div>
                  <p className="text-foreground/30 text-sm">کاربری یافت نشد</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {searchResults.map((user: any) => (
                    <UserCard key={user.id} user={user} />
                  ))}
                </div>
              )}
            </>
          ) : (
            <>
              {/* Suggested Users */}
              <div>
                <h3 className="text-sm font-medium text-foreground/50 mb-3 flex items-center gap-2">
                  <UserPlus className="w-4 h-4" />
                  پیشنهاد برای دنبال کردن
                </h3>
                {suggestedLoading ? (
                  <div className="space-y-2">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="glass rounded-2xl p-4 flex items-center gap-3 animate-pulse">
                        <div className="w-12 h-12 rounded-full bg-white/5" />
                        <div className="flex-1 space-y-2">
                          <div className="h-3 w-24 bg-white/5 rounded" />
                          <div className="h-2 w-32 bg-white/5 rounded" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : suggestedUsers.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-foreground/20 text-xs">همه را دنبال کرده‌اید! ✨</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {suggestedUsers.map((user: any) => (
                      <UserCard key={user.id} user={user} />
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </motion.div>
      )}

      {/* ───── GYMS TAB ───── */}
      {activeTab === "gyms" && (
        <>
          {/* Search Bar */}
          <motion.div variants={itemVariants}>
            <div className="glass rounded-2xl flex items-center gap-3 px-4 py-3">
              <Search className="w-5 h-5 text-foreground/30 shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t("explore.search")}
                className="flex-1 bg-transparent text-sm text-foreground placeholder:text-foreground/30 outline-none"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="text-foreground/30 hover:text-foreground/60 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </motion.div>

          {/* Sport Type Filter Chips */}
      <motion.div variants={itemVariants}>
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          <button
            onClick={() => setSelectedSport(null)}
            className={`shrink-0 px-4 py-2 rounded-full text-xs font-medium transition-all ${
              !selectedSport
                ? "bg-primary text-foreground"
                : "glass text-foreground/60 hover:text-foreground/80"
            }`}
          >
            {t("explore.all")}
          </button>
          {SPORT_TYPES.map((sport) => {
            const Icon = getSportIcon(sport.key)
            return (
              <button
                key={sport.key}
                onClick={() =>
                  setSelectedSport(selectedSport === sport.key ? null : sport.key)
                }
                className={`shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-medium transition-all ${
                  selectedSport === sport.key
                    ? "bg-primary text-foreground"
                    : "glass text-foreground/60 hover:text-foreground/80"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{sport.labelFa}</span>
              </button>
            )
          })}
        </div>
      </motion.div>

      {/* Sort & Results Count */}
      <motion.div variants={itemVariants}>
        <div className="flex items-center justify-between">
          <p className="text-xs text-foreground/40">
            {loading
              ? t("explore.loading") ?? "Loading..."
              : `${sortedGyms.length} ${t("explore.results")}`}
          </p>

          {/* Sort Drawer Trigger */}
          <div className="relative">
            <button
              onClick={() => setShowSortMenu(true)}
              className="flex items-center gap-1.5 text-xs text-foreground/60 hover:text-foreground/80 transition-colors"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>{t("explore.sort")}</span>
              <ChevronDown className="w-3 h-3" />
            </button>

            <MobileDrawer
              open={showSortMenu}
              onClose={() => setShowSortMenu(false)}
              title={t("explore.sort")}
              icon={<SlidersHorizontal className="h-5 w-5" />}
              maxHeight="40vh"
            >
              <div className="flex flex-col gap-1 pb-4">
                {sortOptions.map((opt) => {
                  const isSelected = sortOption === opt.key
                  return (
                    <button
                      key={opt.key}
                      onClick={() => {
                        setSortOption(opt.key)
                        setShowSortMenu(false)
                      }}
                      className={`w-full text-start px-4 py-3.5 rounded-xl text-sm transition-colors ${
                        isSelected
                          ? "bg-primary/15 text-primary font-medium"
                          : "text-foreground/70 hover:bg-white/5"
                      }`}
                    >
                      {opt.label}
                    </button>
                  )
                })}
              </div>
            </MobileDrawer>
          </div>
        </div>
      </motion.div>

      {/* Error State */}
      {error && (
        <motion.div
          variants={itemVariants}
          className="flex flex-col items-center justify-center py-12"
        >
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
            <RefreshCw className="w-8 h-8 text-destructive" />
          </div>
          <p className="text-sm text-foreground/40 mb-4">{error}</p>
          <button
            onClick={fetchGyms}
            className="px-4 py-2 rounded-full bg-primary text-foreground text-xs font-medium hover:bg-primary/80 transition-colors"
          >
            Retry
          </button>
        </motion.div>
      )}

      {/* Loading State — Skeleton Cards */}
      {loading && !error && (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && sortedGyms.length === 0 && (
        <motion.div
          variants={itemVariants}
          className="flex flex-col items-center justify-center py-16"
        >
          <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
            <Search className="w-8 h-8 text-foreground/20" />
          </div>
          <p className="text-sm text-foreground/40">{t("explore.noResults")}</p>
        </motion.div>
      )}

      {/* Gym Cards List */}
      {!loading && !error && sortedGyms.length > 0 && (
        <div className="space-y-3">
          {sortedGyms.map((gym, index) => (
            <Link key={gym.id} href={`/explore/${gym.id}`}>
              <motion.div
                className="glass rounded-2xl overflow-hidden glass-hover haptic-ready"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  delay: index * 0.06,
                  duration: 0.35,
                  ease: "easeOut" as const,
                }}
              >
                {/* Gym Image */}
                <div className="relative h-36 bg-gradient-to-br from-white/10 to-white/5">
                  {gym.primary_photo_url && (
                    <Image
                      src={gym.primary_photo_url}
                      alt={gym.name}
                      fill
                      sizes="(max-width: 768px) 100vw, 400px"
                      className="object-cover"
                    />
                  )}
                  {/* Decorative gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                  {/* Open/Closed Badge */}
                  <div className="absolute top-3 start-3">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold backdrop-blur-md ${
                        gym.isOpen
                          ? "bg-success/20 text-success"
                          : "bg-destructive/20 text-destructive"
                      }`}
                    >
                      <Clock className="w-3 h-3" />
                      {gym.isOpen ? t("explore.open") : t("explore.closed")}
                    </span>
                  </div>

                  {/* Favorite Button */}
                  <button
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      setFavoriteIds((prev) => {
                        const next = new Set(prev)
                        if (next.has(gym.id)) next.delete(gym.id)
                        else next.add(gym.id)
                        return next
                      })
                    }}
                    className="absolute top-3 end-3 w-8 h-8 rounded-full bg-background/30 backdrop-blur-md flex items-center justify-center"
                  >
                    <Heart className={`w-4 h-4 transition-colors ${favoriteIds.has(gym.id) ? "fill-red-500 text-red-500" : "text-foreground/60"}`} />
                  </button>

                  {/* Sport type tags */}
                  <div className="absolute bottom-3 start-3 flex gap-1.5">
                    {gym.sport_types.slice(0, 2).map((st) => {
                      const Icon = getSportIcon(st)
                      return (
                        <span
                          key={st}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-background/40 backdrop-blur-md text-[10px] text-foreground/80"
                        >
                          <Icon className="w-3 h-3" />
                        </span>
                      )
                    })}
                  </div>
                </div>

                {/* Gym Info */}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-semibold text-foreground truncate">
                        {gym.name}
                      </h3>
                      <div className="flex items-center gap-1.5 mt-1">
                        <MapPin className="w-3 h-3 text-foreground/30 shrink-0" />
                        <span className="text-xs text-foreground/40 truncate">
                          {gym.address}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <Star className="w-3.5 h-3.5 text-warning fill-warning" />
                      <span className="text-xs font-semibold text-foreground/80">
                        {gym.avg_rating}
                      </span>
                      <span className="text-[10px] text-foreground/30">
                        ({gym.review_count})
                      </span>
                    </div>
                  </div>

                  {/* Bottom Row: Distance + Price */}
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5">
                    <span className="text-xs text-foreground/40">
                      {gym.distance !== null
                        ? `${gym.distance.toFixed(1)} ${t("explore.km")}`
                        : t("explore.distanceUnavailable") ?? "—"}
                    </span>
                    <span className="text-sm font-bold text-primary">
                      {formatPrice(BigInt(gym.price_per_session))}{" "}
                      <span className="text-[10px] font-normal text-foreground/40">
                        / {t("explore.perSession")}
                      </span>
                    </span>
                  </div>
                </div>
              </motion.div>
            </Link>
          ))}
        </div>
      )}
        </>
      )}
    </motion.div>
  )
}
