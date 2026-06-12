"use client";

import {
  GlobalEngineProvider,
  useGlobalEngine,
  DynamicRenderer,
  type LayoutItem,
} from "@/lib/GlobalEngineContext";
import { Dumbbell, Globe, Wallet, ToggleLeft, LayoutGrid } from "lucide-react";

// ─── Demo inner page (needs to be inside provider) ────────────────
function GlobalDemoContent() {
  const {
    locale,
    dir,
    t,
    formatPrice,
    isFeatureEnabled,
    toggleFeature,
    setLocale,
  } = useGlobalEngine();

  // Dynamic layout JSON config
  const layoutConfig: LayoutItem[] = [
    { type: "header" },
    { type: "wallet" },
    { type: "stats" },
  ];

  // The raw bigint value for currency demo
  const demoAmount = BigInt(500000);

  return (
    <div className="min-h-screen bg-black px-4 pb-12 pt-8 sm:px-6 lg:px-8" dir={dir}>
      <div className="mx-auto max-w-4xl">
        {/* ── Header ──────────────────────────────────────── */}
        <header className="mb-10 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <Dumbbell className="h-4 w-4 text-primary" />
            </div>
            <span className="text-sm font-medium text-primary">
              Gym Global Athlete
            </span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            {t("global_demo.title")}
          </h1>
          <p className="max-w-xl text-sm text-foreground/40">
            {t("global_demo.subtitle")}
          </p>
        </header>

        {/* ── 1. Language Switcher ─────────────────────────── */}
        <section className="mb-10 flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">
              {t("global_demo.language")}
            </h2>
            <span className="rounded-full bg-white/5 px-2 py-0.5 font-mono text-[10px] text-foreground/30">
              {dir.toUpperCase()}
            </span>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setLocale("en")}
              className={`haptic-ready glass flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-medium transition-all ${
                locale === "en"
                  ? "ring-1 ring-primary bg-primary/10 text-primary"
                  : "text-foreground/50 hover:text-foreground hover:bg-white/5"
              }`}
            >
              <span className="text-lg">🇺🇸</span>
              {t("global_demo.english")}
            </button>
            <button
              onClick={() => setLocale("fa")}
              className={`haptic-ready glass flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-medium transition-all ${
                locale === "fa"
                  ? "ring-1 ring-primary bg-primary/10 text-primary"
                  : "text-foreground/50 hover:text-foreground hover:bg-white/5"
              }`}
            >
              <span className="text-lg">🇮🇷</span>
              {t("global_demo.persian")}
            </button>
          </div>
        </section>

        {/* ── 2. Currency Display ──────────────────────────── */}
        <section className="mb-10 flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-lg font-semibold text-foreground">
              {t("global_demo.currency_title")}
            </h2>
            <p className="text-sm text-foreground/40">
              {t("global_demo.currency_desc")}
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* USD Card */}
            <div className="glass flex flex-col gap-3 rounded-2xl p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-foreground/40">
                  {t("global_demo.usd_label")}
                </span>
                <span className="rounded-full bg-success/10 px-2 py-0.5 text-[10px] text-success">
                  USD
                </span>
              </div>
              <span className="text-2xl font-bold text-foreground">
                {formatPrice(demoAmount, "US")}
              </span>
              <span className="font-mono text-[10px] text-foreground/20">
                {t("global_demo.minor_units")} {demoAmount.toString()}
              </span>
            </div>

            {/* IRR Card */}
            <div className="glass flex flex-col gap-3 rounded-2xl p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-foreground/40">
                  {t("global_demo.irr_label")}
                </span>
                <span className="rounded-full bg-warning/10 px-2 py-0.5 text-[10px] text-warning">
                  IRR → Toman
                </span>
              </div>
              <span className="text-2xl font-bold text-foreground" dir="rtl">
                {formatPrice(demoAmount, "IR")}
              </span>
              <span className="font-mono text-[10px] text-foreground/20">
                {t("global_demo.minor_units")} {demoAmount.toString()}
              </span>
            </div>
          </div>
        </section>

        {/* ── 3. Feature Flags ─────────────────────────────── */}
        <section className="mb-10 flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <ToggleLeft className="h-4 w-4 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">
              {t("global_demo.feature_title")}
            </h2>
          </div>
          <p className="text-sm text-foreground/40">
            {t("global_demo.feature_desc")}
          </p>

          <div className="glass flex flex-col gap-4 rounded-2xl p-5">
            {/* Feature toggle rows */}
            {(["wallet", "social_feed", "premium_coaching"] as const).map(
              (feature_key) => {
                const enabled = isFeatureEnabled(feature_key);
                return (
                  <div
                    key={feature_key}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                          enabled ? "bg-success/10" : "bg-white/5"
                        }`}
                      >
                        <Wallet
                          className={`h-4 w-4 ${
                            enabled ? "text-success" : "text-foreground/20"
                          }`}
                        />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-foreground">
                          {feature_key.replace(/_/g, " ")}
                        </span>
                        <span
                          className={`text-[10px] ${
                            enabled ? "text-success" : "text-foreground/30"
                          }`}
                        >
                          {enabled
                            ? t("global_demo.enabled")
                            : t("global_demo.disabled")}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => toggleFeature(feature_key)}
                      className={`haptic-ready relative h-6 w-11 rounded-full transition-colors ${
                        enabled ? "bg-success" : "bg-white/10"
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-all ${
                          enabled ? "start-[22px]" : "start-0.5"
                        }`}
                      />
                    </button>
                  </div>
                );
              }
            )}

            {/* Wallet Feature Gate Demo */}
            <div className="mt-2 rounded-xl border border-white/5 bg-white/[0.02] p-4">
              <div className="mb-2 flex items-center gap-2">
                <Wallet
                  className={`h-4 w-4 ${
                    isFeatureEnabled("wallet")
                      ? "text-success"
                      : "text-warning"
                  }`}
                />
                <span className="text-sm font-medium text-foreground">
                  {t("global_demo.wallet")}
                </span>
              </div>
              {isFeatureEnabled("wallet") ? (
                <div className="flex items-center gap-2 rounded-xl bg-success/5 px-3 py-2">
                  <span className="text-xs text-success">
                    {t("global_demo.wallet_balance")}:{" "}
                    {formatPrice(BigInt(2500000), "IR")}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2 rounded-xl bg-warning/5 px-3 py-2">
                  <span className="text-xs text-warning">
                    {t("global_demo.wallet_disabled")}
                  </span>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ── 4. Dynamic Layout Section ────────────────────── */}
        <section className="mb-10 flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <LayoutGrid className="h-4 w-4 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">
              {t("global_demo.dynamic_title")}
            </h2>
          </div>
          <p className="text-sm text-foreground/40">
            {t("global_demo.dynamic_desc")}
          </p>

          {/* JSON Config Preview */}
          <div className="glass rounded-xl p-4 font-mono text-[11px] text-foreground/30">
            <pre dir="ltr">{JSON.stringify(layoutConfig, null, 2)}</pre>
          </div>

          {/* Rendered Layout */}
          <DynamicRenderer config={layoutConfig} />
        </section>

        {/* ── Footer ───────────────────────────────────────── */}
        <footer className="flex items-center justify-between border-t border-white/5 pt-6">
          <span className="text-xs text-foreground/20">
            Global Engine — Gym Global Athlete PWA
          </span>
          <span className="font-mono text-[10px] text-foreground/10">
            {locale} · {dir}
          </span>
        </footer>
      </div>
    </div>
  );
}

// ─── Page (wraps content in provider) ──────────────────────────────
export default function GlobalDemoPage() {
  return (
    <GlobalEngineProvider>
      <GlobalDemoContent />
    </GlobalEngineProvider>
  );
}