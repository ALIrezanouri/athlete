/// <reference lib="webworker" />

// ─── Rokhdad FIT Service Worker ───────────────────────────────────────────────
// Version: bump this to invalidate old caches on deploy
const SW_VERSION = "v1";

// Cache names
const STATIC_CACHE = `static-${SW_VERSION}`;
const DYNAMIC_CACHE = `dynamic-${SW_VERSION}`;
const API_CACHE = `api-${SW_VERSION}`;

// Cache durations (in seconds)
const STATIC_MAX_AGE = 30 * 24 * 60 * 60; // 30 days
const API_MAX_AGE = 5 * 60; // 5 minutes
const HTML_MAX_AGE = 24 * 60 * 60; // 24 hours

// ─── Install Event ────────────────────────────────────────────────────────────
// Pre-cache critical static assets for offline support
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll([
        "/offline",
        "/home",
        "/icons/icon-192x192.png",
        "/icons/icon-512x512.png",
      ]);
    })
  );
  // Activate immediately without waiting for existing clients to close
  self.skipWaiting();
});

// ─── Activate Event ───────────────────────────────────────────────────────────
// Clean up old caches from previous versions
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== STATIC_CACHE && key !== DYNAMIC_CACHE && key !== API_CACHE)
          .map((key) => caches.delete(key))
      )
    )
  );
  // Take control of all clients immediately
  self.clients.claim();
});

// ─── Route Classification Helpers ─────────────────────────────────────────────

/**
 * Check if a URL should be excluded from caching entirely.
 * This includes auth routes and Supabase auth endpoints.
 */
function isExcludedRoute(url) {
  const pathname = url.pathname;
  const href = url.href;

  // Auth routes — never cache
  if (pathname.startsWith("/auth")) return true;
  if (pathname === "/login") return true;

  // Supabase auth endpoints
  if (href.includes("/auth/v1/")) return true;

  return false;
}

/**
 * Check if a request is a static asset (JS/CSS bundles, images, fonts).
 */
function isStaticAsset(url) {
  const pathname = url.pathname;

  // Next.js static assets
  if (pathname.startsWith("/_next/static/")) return true;

  // Image files
  if (/\.(png|jpg|jpeg|webp|svg|gif|ico|avif)$/.test(pathname)) return true;

  // Font files
  if (/\.(woff2?|ttf|otf|eot)$/.test(pathname)) return true;

  // Public assets
  if (pathname.startsWith("/icons/")) return true;
  if (pathname.startsWith("/fonts/")) return true;

  return false;
}

/**
 * Check if a request is an API call or server action.
 */
function isApiRequest(request, url) {
  const pathname = url.pathname;

  // API routes
  if (pathname.startsWith("/api/")) return true;

  // Server actions (POST requests with Next headers)
  if (request.method === "POST") return true;

  return false;
}

/**
 * Check if a request is an HTML page navigation.
 */
function isHtmlNavigation(request) {
  // Navigation requests (page loads)
  if (request.mode === "navigate") return true;

  // HTML accept header
  const accept = request.headers.get("accept") || "";
  if (accept.includes("text/html")) return true;

  return false;
}

// ─── Caching Strategies ──────────────────────────────────────────────────────

/**
 * Cache-First Strategy: Check cache first, fall back to network.
 * Used for static assets (JS/CSS, images, fonts).
 * Cache for 30 days.
 */
async function cacheFirst(request) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE);
      // Clone before putting — response can only be consumed once
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    // Network failed and no cache — return a basic offline response
    return new Response("Offline", { status: 503, statusText: "Service Unavailable" });
  }
}

/**
 * Network-First Strategy: Try network first, fall back to cache.
 * Used for API routes and server actions.
 * Cache successful responses for 5 minutes.
 */
async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);

    // Only cache GET requests with successful responses
    if (request.method === "GET" && networkResponse.ok) {
      const cache = await caches.open(API_CACHE);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    // Network failed — try cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    // No cache available for API requests
    return new Response(JSON.stringify({ error: "Offline" }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }
}

/**
 * Stale-While-Revalidate Strategy: Serve from cache immediately,
 * then update cache in the background.
 * Used for HTML page navigations.
 * Cache for 24 hours.
 */
async function staleWhileRevalidate(request) {
  const cache = await caches.open(DYNAMIC_CACHE);
  const cachedResponse = await cache.match(request);

  // Fetch in background to update cache
  const fetchPromise = fetch(request)
    .then((networkResponse) => {
      if (networkResponse.ok) {
        cache.put(request, networkResponse.clone());
      }
      return networkResponse;
    })
    .catch(() => {
      // Network failed — that's OK, we'll use cache
      return null;
    });

  // Return cached response immediately if available
  if (cachedResponse) {
    // Revalidate in background (don't await)
    fetchPromise;
    return cachedResponse;
  }

  // No cache — wait for network
  const networkResponse = await fetchPromise;
  if (networkResponse) {
    return networkResponse;
  }

  // Both cache and network failed — show offline page for navigations
  if (request.mode === "navigate") {
    const offlineResponse = await caches.match("/offline");
    if (offlineResponse) {
      return offlineResponse;
    }
  }

  return new Response("Offline", { status: 503, statusText: "Service Unavailable" });
}

// ─── Fetch Event Handler ─────────────────────────────────────────────────────
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle same-origin requests
  if (url.origin !== self.location.origin) return;

  // Skip non-GET requests for excluded routes (auth, login)
  if (request.method === "POST" && isExcludedRoute(url)) return;

  // Skip all requests for excluded routes
  if (isExcludedRoute(url)) return;

  // Determine strategy based on request type
  let strategy;

  if (isApiRequest(request, url)) {
    strategy = networkFirst;
  } else if (isStaticAsset(url)) {
    strategy = cacheFirst;
  } else if (isHtmlNavigation(request)) {
    strategy = staleWhileRevalidate;
  } else {
    // Default: stale-while-revalidate for everything else
    strategy = staleWhileRevalidate;
  }

  event.respondWith(strategy(request));
});
