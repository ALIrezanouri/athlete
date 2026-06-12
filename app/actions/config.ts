"use server";

import { createClient } from "@/lib/supabase/server";
import { unstable_cache } from "next/cache";
import { createClient as createPlainClient } from "@supabase/supabase-js";
import { withRetry } from "@/lib/retry";

// ─── Types ──────────────────────────────────────────────────────

export interface CurrencyConfig {
  country_id: string;
  currency_code: string;
  symbol: string;
  locale: string;
  decimals: number;
  is_rtl: boolean;
  display_unit?: string;
  unit_divisor?: number;
}

export interface FeatureFlag {
  feature_key: string;
  is_enabled: boolean;
  country_id?: string | null;
  description?: string | null;
}

// ─── Get Translations ───────────────────────────────────────────
// Fetches all translations for a given locale from the DB.
// Returns a flat Record<string, string> for easy lookup.

export async function getTranslations(locale: string = "fa") {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("translations")
      .select("key, value")
      .eq("locale", locale);

    if (error) {
      console.error("[CONFIG] Failed to fetch translations:", error.message);
      return { success: false, error: error.message };
    }

    // Convert array of {key, value} to Record<string, string>
    const dict: Record<string, string> = {};
    for (const row of data) {
      dict[row.key] = row.value;
    }

    return { success: true, data: dict };
  } catch (err) {
    console.error("[CONFIG] Unexpected error in getTranslations:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

// ─── Get All Translations (both locales) ────────────────────────
// Fetches translations for both en and fa locales.
// Returns Record<locale, Record<string, string>> matching the old mock shape.

export async function getAllTranslations() {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("translations")
      .select("locale, key, value");

    if (error) {
      console.error("[CONFIG] Failed to fetch all translations:", error.message);
      return { success: false, error: error.message };
    }

    // Group by locale
    const result: Record<string, Record<string, string>> = { en: {}, fa: {} };
    for (const row of data) {
      if (!result[row.locale]) {
        result[row.locale] = {};
      }
      result[row.locale][row.key] = row.value;
    }

    return { success: true, data: result };
  } catch (err) {
    console.error("[CONFIG] Unexpected error in getAllTranslations:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

// ─── Get Currency Configs ───────────────────────────────────────
// Fetches currency configuration from the countries table.
// Replaces the hardcoded currencyConfigs in GlobalEngineContext.

export async function getCurrencyConfigs() {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("countries")
      .select(
        "id, currency_code, currency_symbol, is_rtl, currency_decimals, currency_display_unit, currency_unit_divisor, currency_locale, default_locale"
      )
      .eq("is_active", true);

    if (error) {
      console.error("[CONFIG] Failed to fetch currency configs:", error.message);
      return { success: false, error: error.message };
    }

    // Map to CurrencyConfig shape, keyed by country_id
    const configs: Record<string, CurrencyConfig> = {};
    for (const country of data) {
      configs[country.id] = {
        country_id: country.id,
        currency_code: country.currency_code,
        symbol: country.currency_symbol,
        locale: country.currency_locale,
        decimals: country.currency_decimals,
        is_rtl: country.is_rtl,
        display_unit: country.currency_display_unit || undefined,
        unit_divisor: country.currency_unit_divisor || undefined,
      };
    }

    return { success: true, data: configs };
  } catch (err) {
    console.error("[CONFIG] Unexpected error in getCurrencyConfigs:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

// ─── Get Feature Flags ──────────────────────────────────────────
// Fetches feature flags from the DB.
// Optionally filters by country_id for country-specific flags.

export async function getFeatureFlags(countryId?: string) {
  try {
    const supabase = await createClient();

    let query = supabase
      .from("feature_flags")
      .select("feature_key, is_enabled, country_id, description");

    // If countryId provided, get global flags (country_id IS NULL) + country-specific flags
    if (countryId) {
      query = query.or(`country_id.is.null,country_id.eq.${countryId}`);
    }

    const { data, error } = await query;

    if (error) {
      console.error("[CONFIG] Failed to fetch feature flags:", error.message);
      return { success: false, error: error.message };
    }

    // Convert to Record<string, boolean> for easy lookup
    // Country-specific flags override global flags
    const flags: Record<string, boolean> = {};
    for (const flag of data) {
      // If there's a country-specific flag, it takes precedence
      if (flag.country_id === null || flag.country_id === countryId) {
        flags[flag.feature_key] = flag.is_enabled;
      }
    }

    return { success: true, data: flags };
  } catch (err) {
    console.error("[CONFIG] Unexpected error in getFeatureFlags:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

// ─── Get RTL Map ────────────────────────────────────────────────
// Derives RTL status per locale from the countries table.

export async function getRtlMap() {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("countries")
      .select("default_locale, is_rtl")
      .eq("is_active", true);

    if (error) {
      console.error("[CONFIG] Failed to fetch RTL map:", error.message);
      return { success: false, error: error.message };
    }

    // Map locale → is_rtl
    const rtlMap: Record<string, boolean> = {};
    for (const country of data) {
      // Extract short locale (e.g., "fa" from "fa-IR")
      const shortLocale = country.default_locale?.split("-")[0] || "fa";
      rtlMap[shortLocale] = country.is_rtl;
    }

    return { success: true, data: rtlMap };
  } catch (err) {
    console.error("[CONFIG] Unexpected error in getRtlMap:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

// ─── Get All Config (Batched) ────────────────────────────────────
// Fetches translations, currency configs, feature flags, and RTL map
// in a SINGLE Supabase client call — reduces 4 server actions → 1.
// getUserCountryId is kept separate because it requires auth.

export interface AllConfigData {
  translations: Record<string, Record<string, string>>;
  currencyConfigs: Record<string, CurrencyConfig>;
  featureFlags: Record<string, boolean>;
  rtlMap: Record<string, boolean>;
}

// ─── unstable_cache wrapper (survives serverless cold starts) ────
// Uses a plain Supabase client (no cookies) because config data is public
// and does not require auth context. The module-level TTL cache below
// acts as a secondary in-memory layer on top of this persistent cache.
const cachedFetchConfig = unstable_cache(
  async (): Promise<AllConfigData> => {
    const supabase = createPlainClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Run all 4 config queries in parallel
    const [transResult, currencyResult, flagsResult, rtlResult] =
      await Promise.all([
        withRetry(
          () => supabase.from("translations").select("locale, key, value"),
          { label: "getAllConfig.translations" }
        ),
        withRetry(
          () =>
            supabase
              .from("countries")
              .select(
                "id, currency_code, currency_symbol, is_rtl, currency_decimals, currency_display_unit, currency_unit_divisor, currency_locale, default_locale"
              )
              .eq("is_active", true),
          { label: "getAllConfig.currencyConfigs" }
        ),
        withRetry(
          () =>
            supabase
              .from("feature_flags")
              .select("feature_key, is_enabled, country_id, description"),
          { label: "getAllConfig.featureFlags" }
        ),
        withRetry(
          () =>
            supabase
              .from("countries")
              .select("default_locale, is_rtl")
              .eq("is_active", true),
          { label: "getAllConfig.rtlMap" }
        ),
      ]);

    // Process translations
    const translations: Record<string, Record<string, string>> = {
      en: {},
      fa: {},
    };
    if (!transResult.error && transResult.data) {
      for (const row of transResult.data) {
        if (!translations[row.locale]) translations[row.locale] = {};
        translations[row.locale][row.key] = row.value;
      }
    } else if (transResult.error) {
      console.error("[CONFIG] Batch: translations error:", transResult.error.message);
    }

    // Process currency configs
    const currencyConfigs: Record<string, CurrencyConfig> = {};
    if (!currencyResult.error && currencyResult.data) {
      for (const country of currencyResult.data) {
        currencyConfigs[country.id] = {
          country_id: country.id,
          currency_code: country.currency_code,
          symbol: country.currency_symbol,
          locale: country.currency_locale,
          decimals: country.currency_decimals,
          is_rtl: country.is_rtl,
          display_unit: country.currency_display_unit || undefined,
          unit_divisor: country.currency_unit_divisor || undefined,
        };
      }
    } else if (currencyResult.error) {
      console.error("[CONFIG] Batch: currency error:", currencyResult.error.message);
    }

    // Process feature flags (global flags only — country-specific filtered later)
    const featureFlags: Record<string, boolean> = {};
    if (!flagsResult.error && flagsResult.data) {
      for (const flag of flagsResult.data) {
        if (flag.country_id === null) {
          featureFlags[flag.feature_key] = flag.is_enabled;
        }
      }
    } else if (flagsResult.error) {
      console.error("[CONFIG] Batch: flags error:", flagsResult.error.message);
    }

    // Process RTL map
    const rtlMap: Record<string, boolean> = {};
    if (!rtlResult.error && rtlResult.data) {
      for (const country of rtlResult.data) {
        const shortLocale = country.default_locale?.split("-")[0] || "fa";
        rtlMap[shortLocale] = country.is_rtl;
      }
    } else if (rtlResult.error) {
      console.error("[CONFIG] Batch: rtl error:", rtlResult.error.message);
    }

    return { translations, currencyConfigs, featureFlags, rtlMap };
  },
  ["app-config"],
  { revalidate: 300, tags: ["config"] }
);

// ─── Module-level TTL cache (5 min, secondary layer) ─────────────
// Config data rarely changes. This in-memory cache sits on top of
// unstable_cache to avoid even the deserialization cost within a
// warm server instance.
let _configCache: { data: AllConfigData; ts: number } | null = null;
const CONFIG_TTL_MS = 5 * 60 * 1000; // 5 minutes

export async function getAllConfig(): Promise<{
  success: boolean;
  error?: string;
  data?: AllConfigData;
}> {
  // Return cached data if still fresh
  if (_configCache && Date.now() - _configCache.ts < CONFIG_TTL_MS) {
    return { success: true, data: _configCache.data };
  }

  try {
    // Use unstable_cache-wrapped fetch (survives serverless cold starts)
    const data = await cachedFetchConfig();

    // Update module-level cache
    _configCache = { data, ts: Date.now() };

    return { success: true, data };
  } catch (err) {
    console.error("[CONFIG] Unexpected error in getAllConfig:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

// ─── Get User Country (cached per user, 60s TTL) ────────────────
// Fetches the current user's country_id from their profile.
// Used by GlobalEngineContext to provide countryId to all pages.
// Cached for 60 seconds per user to avoid hitting Supabase twice
// (getUser + profile query) on every single request.

let _userCountryCache: { userId: string; countryId: string; ts: number } | null = null;
const USER_COUNTRY_CACHE_TTL = 60_000; // 60 seconds

export async function getUserCountryId(): Promise<{
  success: boolean;
  error?: string;
  data?: string;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    // Return cached data if still fresh and same user
    if (
      _userCountryCache &&
      _userCountryCache.userId === user.id &&
      Date.now() - _userCountryCache.ts < USER_COUNTRY_CACHE_TTL
    ) {
      return { success: true, data: _userCountryCache.countryId };
    }

    const { data: profile, error: profileError } = await withRetry(
      () => supabase
        .from("profiles")
        .select("country_id")
        .eq("id", user.id)
        .is("deleted_at", null)
        .single(),
      { label: "getUserCountryId" }
    );

    if (profileError) {
      console.error("[CONFIG] Error fetching user country:", profileError);
      return { success: false, error: "Failed to fetch user country" };
    }

    const countryId = profile?.country_id ?? "IR";

    // Store in cache
    _userCountryCache = { userId: user.id, countryId, ts: Date.now() };

    return { success: true, data: countryId };
  } catch (err) {
    console.error("[CONFIG] Unexpected error in getUserCountryId:", err);
    return { success: false, error: "Unexpected error" };
  }
}