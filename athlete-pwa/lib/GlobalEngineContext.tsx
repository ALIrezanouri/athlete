"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import { Dumbbell, Wallet, Activity, type LucideIcon } from "lucide-react";
import {
  getAllConfig,
  getUserCountryId,
  type CurrencyConfig,
} from "@/app/actions/config";
import {
  type Locale,
  type Direction,
  fallbackTranslations,
  fallbackCurrencyConfigs,
  fallbackFeatureFlags,
  fallbackRtlMap,
} from "@/lib/fallback-config";

// ─── Types (matching SQL schema) ──────────────────────────────────
// Locale and Direction are imported from fallback-config

interface GlobalEngineState {
  locale: Locale;
  dir: Direction;
  countryId: string;
  t: (key: string) => string;
  formatPrice: (amount: bigint, countryCode?: string) => string;
  isFeatureEnabled: (feature_key: string) => boolean;
  toggleFeature: (feature_key: string) => void;
  setLocale: (locale: Locale) => void;
}

// ─── Context ──────────────────────────────────────────────────────
const GlobalEngineContext = createContext<GlobalEngineState | null>(null);

// ─── Provider ─────────────────────────────────────────────────────
export function GlobalEngineProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("fa");

  // State for Supabase-backed data (initialized with fallbacks)
  const [translations, setTranslations] =
    useState<Record<Locale, Record<string, string>>>(fallbackTranslations);
  const [currencyConfigs, setCurrencyConfigs] =
    useState<Record<string, CurrencyConfig>>(fallbackCurrencyConfigs);
  const [featureFlags, setFeatureFlags] =
    useState<Record<string, boolean>>(fallbackFeatureFlags);
  const [rtlMap, setRtlMap] =
    useState<Record<string, boolean>>(fallbackRtlMap);
  const [countryId, setCountryId] = useState<string>("IR");

  // ─── Timeout wrapper — prevents config fetch from blocking UI ────
  function withTimeout<T>(promise: Promise<T>, ms: number = 8000): Promise<T | null> {
    return Promise.race([
      promise,
      new Promise<null>((resolve) => setTimeout(() => resolve(null), ms)),
    ]);
  }

  // Track mounted state to prevent state updates after unmount
  const mountedRef = useRef(true);

  // ─── CRITICAL: Fetch user country immediately (auth-dependent) ───
  // getUserCountryId() requires cookie-based auth (supabase.auth.getUser)
  // and determines countryId for formatPrice(). Must fire on mount.
  useEffect(() => {
    let cancelled = false;

    async function loadUserCountry() {
      try {
        const countryResult = await withTimeout(getUserCountryId(), 8000);

        if (!cancelled && mountedRef.current && countryResult?.success && countryResult?.data) {
          setCountryId(countryResult.data);
        }
      } catch (err) {
        console.warn(
          "[GlobalEngine] Failed to load user country, using fallback:",
          err
        );
      }
    }

    loadUserCountry();
    return () => { cancelled = true; };
  }, []);

  // ─── NON-CRITICAL: Defer config fetch to idle time ──────────────
  // getAllConfig() fetches translations, currencyConfigs, featureFlags,
  // and rtlMap — all have complete fallbacks so the UI renders immediately.
  // Deferring via requestIdleCallback yields the main thread for the
  // critical paint and auth fetch above.
  useEffect(() => {
    let cancelled = false;

    async function loadConfig() {
      try {
        const configResult = await withTimeout(getAllConfig(), 8000);

        if (!cancelled && mountedRef.current && configResult?.success && configResult?.data) {
          const { translations, currencyConfigs, featureFlags, rtlMap } =
            configResult.data;

          // Merge with fallbacks so any missing keys still have values
          const mergedTrans: Record<Locale, Record<string, string>> = {
            en: { ...fallbackTranslations.en, ...translations.en },
            fa: { ...fallbackTranslations.fa, ...translations.fa },
          };
          setTranslations(mergedTrans);

          const mergedCurrency: Record<string, CurrencyConfig> = {
            ...fallbackCurrencyConfigs,
            ...currencyConfigs,
          };
          setCurrencyConfigs(mergedCurrency);

          const mergedFlags: Record<string, boolean> = {
            ...fallbackFeatureFlags,
            ...featureFlags,
          };
          setFeatureFlags(mergedFlags);

          const mergedRtl: Record<string, boolean> = {
            ...fallbackRtlMap,
            ...rtlMap,
          };
          setRtlMap(mergedRtl);
        }
      } catch (err) {
        // Silently fall back to hardcoded defaults — app still works
        console.warn(
          "[GlobalEngine] Failed to load config from Supabase, using fallbacks:",
          err
        );
      }
    }

    // Schedule config fetch during browser idle time (or next tick)
    const idleId =
      typeof requestIdleCallback !== "undefined"
        ? requestIdleCallback(() => { if (!cancelled) loadConfig(); })
        : setTimeout(() => { if (!cancelled) loadConfig(); }, 0);

    return () => {
      cancelled = true;
      if (typeof cancelIdleCallback !== "undefined" && typeof requestIdleCallback !== "undefined") {
        cancelIdleCallback(idleId as number);
      } else {
        clearTimeout(idleId as ReturnType<typeof setTimeout>);
      }
    };
  }, []);

  // Cleanup mounted ref on unmount
  useEffect(() => {
    return () => { mountedRef.current = false; };
  }, []);

  const dir: Direction = rtlMap[locale] ? "rtl" : "ltr";

  const setLocale = useCallback(
    (newLocale: Locale) => {
      setLocaleState(newLocale);
      const root = document.documentElement;
      root.dir = rtlMap[newLocale] ? "rtl" : "ltr";
      root.lang = newLocale;
    },
    [rtlMap]
  );

  const t = useCallback(
    (key: string): string => translations[locale]?.[key] ?? key,
    [locale, translations]
  );

  const formatPrice = useCallback(
    (amount: bigint, countryCode?: string): string => {
      const cc = countryCode ?? countryId;
      const config = currencyConfigs[cc];
      if (!config) return amount.toString();

      // Step 1: minor units → major units
      const power = BigInt(10 ** config.decimals);
      const majorVal = amount / power;
      const minorVal = amount % power;

      // Step 2: apply display conversion (e.g., rial → toman)
      let displayVal = Number(majorVal);
      if (config.unit_divisor) {
        displayVal = displayVal / config.unit_divisor;
      }

      // Step 3: format integer part with locale
      const numFormatted = new Intl.NumberFormat(config.locale).format(
        Math.floor(displayVal)
      );

      // Step 4: append decimal places if currency requires them
      let result = numFormatted;
      if (config.decimals > 0) {
        const minorStr = Number(minorVal)
          .toString()
          .padStart(config.decimals, "0");
        result = `${numFormatted}.${minorStr}`;
      }

      // Step 5: append symbol / display unit
      const symbol = config.display_unit ?? config.symbol;
      return `${result} ${symbol}`;
    },
    [currencyConfigs, countryId]
  );

  const isFeatureEnabled = useCallback(
    (feature_key: string): boolean => featureFlags[feature_key] ?? false,
    [featureFlags]
  );

  const toggleFeature = useCallback((feature_key: string) => {
    setFeatureFlags((prev) => ({
      ...prev,
      [feature_key]: !(prev[feature_key] ?? false),
    }));
  }, []);

  const value = useMemo<GlobalEngineState>(
    () => ({
      locale,
      dir,
      countryId,
      t,
      formatPrice,
      isFeatureEnabled,
      toggleFeature,
      setLocale,
    }),
    [locale, dir, countryId, t, formatPrice, isFeatureEnabled, toggleFeature, setLocale]
  );

  return (
    <GlobalEngineContext.Provider value={value}>
      {children}
    </GlobalEngineContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────
export function useGlobalEngine(): GlobalEngineState {
  const ctx = useContext(GlobalEngineContext);
  if (!ctx)
    throw new Error("useGlobalEngine must be used within GlobalEngineProvider");
  return ctx;
}

// ─── Dynamic Layout Engine ────────────────────────────────────────
export interface LayoutItem {
  type: string;
  props?: Record<string, unknown>;
}

// Glassmorphic card shells for dynamic rendering
function GlassCard({
  icon: Icon,
  title,
  description,
  accent = "#3A86FF",
  children,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  accent?: string;
  children?: ReactNode;
}) {
  return (
    <div className="glass flex flex-col gap-3 rounded-2xl p-5">
      <div className="flex items-center gap-3">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
          style={{ backgroundColor: `${accent}15` }}
        >
          <Icon className="h-5 w-5" style={{ color: accent }} />
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-semibold text-white">{title}</span>
          <span className="text-xs text-white/40">{description}</span>
        </div>
      </div>
      {children}
    </div>
  );
}

// Component registry for DynamicRenderer
function HeaderCard() {
  const { t } = useGlobalEngine();
  return (
    <GlassCard
      icon={Dumbbell}
      title={t("global_demo.header_card")}
      description={t("global_demo.header_card_desc")}
      accent="#3A86FF"
    >
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/5">
        <div
          className="h-full rounded-full bg-primary"
          style={{ width: "72%" }}
        />
      </div>
    </GlassCard>
  );
}

function WalletCard() {
  const { t, formatPrice, isFeatureEnabled } = useGlobalEngine();
  const enabled = isFeatureEnabled("wallet");

  if (!enabled) {
    return (
      <GlassCard
        icon={Wallet}
        title={t("global_demo.wallet")}
        description={t("global_demo.wallet_disabled")}
        accent="#FF6B35"
      >
        <div className="flex items-center gap-2 rounded-xl bg-warning/10 px-3 py-2">
          <span className="text-xs text-warning">
            {t("global_demo.wallet_disabled")}
          </span>
        </div>
      </GlassCard>
    );
  }

  return (
    <GlassCard
      icon={Wallet}
      title={t("global_demo.wallet")}
      description={t("global_demo.wallet_desc")}
      accent="#00E676"
    >
      <div className="flex items-center justify-between">
        <span className="text-xs text-white/40">
          {t("global_demo.wallet_balance")}
        </span>
        <span className="text-lg font-bold text-success">
          {formatPrice(BigInt(2500000))}
        </span>
      </div>
    </GlassCard>
  );
}

function StatsCard() {
  const { t } = useGlobalEngine();
  return (
    <GlassCard
      icon={Activity}
      title={t("global_demo.stats_card")}
      description={t("global_demo.stats_card_desc")}
      accent="#9C40FF"
    >
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "12", sub: t("global_demo.stats_sets") },
          { label: "8,432", sub: t("global_demo.stats_steps") },
          { label: "542", sub: t("global_demo.stats_kcal") },
        ].map((stat) => (
          <div
            key={stat.sub}
            className="flex flex-col items-center gap-1 rounded-xl bg-white/[0.03] py-2"
          >
            <span className="text-sm font-bold text-white">{stat.label}</span>
            <span className="text-[10px] text-white/30">{stat.sub}</span>
          </div>
        ))}
      </div>
    </GlassCard>
  );
}

const componentRegistry: Record<string, () => ReactNode> = {
  header: HeaderCard,
  wallet: WalletCard,
  stats: StatsCard,
};

export function DynamicRenderer({ config }: { config: LayoutItem[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {config.map((item, i) => {
        const Component = componentRegistry[item.type];
        if (!Component) return null;
        return <Component key={`${item.type}-${i}`} />;
      })}
    </div>
  );
}