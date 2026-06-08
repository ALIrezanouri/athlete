"use client"

/**
 * Offline Fallback Page
 *
 * Shown by the service worker when a navigation request fails
 * and there's no cached version available. Uses the app's
 * dark theme (bg-[#0a0a0a]) and RTL layout.
 */
export default function OfflinePage() {
  return (
    <html lang="fa" dir="rtl">
      <body
        style={{
          margin: 0,
          backgroundColor: "#0a0a0a",
          color: "#ffffff",
          fontFamily:
            "var(--font-vazirmatn, system-ui, -apple-system, sans-serif)",
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          padding: "2rem",
        }}
      >
        {/* WiFi-off icon */}
        <div style={{ fontSize: "4rem", marginBottom: "1.5rem" }}>&#x1F4F5;</div>

        <h1
          style={{
            fontSize: "1.5rem",
            fontWeight: 700,
            marginBottom: "0.75rem",
            color: "#ffffff",
          }}
        >
          &#x0634;&#x0645;&#x0627; &#x0622;&#x0641;&#x0644;&#x0627;&#x06CC;&#x0646; &#x0647;&#x0633;&#x062A;&#x06CC;&#x062F;
        </h1>

        <p
          style={{
            fontSize: "1rem",
            color: "#a1a1aa",
            marginBottom: "2rem",
            maxWidth: "20rem",
            lineHeight: 1.6,
          }}
        >
          &#x0627;&#x062A;&#x0635;&#x0627;&#x0644; &#x0627;&#x06CC;&#x0646;&#x062A;&#x0631;&#x0646;&#x062A; &#x062E;&#x0648;&#x062F; &#x0631;&#x0627; &#x0628;&#x0631;&#x0631;&#x0633;&#x06CC; &#x06A9;&#x0646;&#x06CC;&#x062F; &#x0648; &#x062F;&#x0648;&#x0628;&#x0627;&#x0631;&#x0647; &#x062A;&#x0644;&#x0627;&#x0634; &#x06A9;&#x0646;&#x06CC;&#x062F;.
        </p>

        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", justifyContent: "center" }}>
          {/* Retry button */}
          <button
            onClick={() => window.location.reload()}
            style={{
              backgroundColor: "#6D28D9",
              color: "#ffffff",
              border: "none",
              borderRadius: "0.75rem",
              padding: "0.75rem 1.5rem",
              fontSize: "1rem",
              fontWeight: 600,
              cursor: "pointer",
              transition: "background-color 0.2s",
            }}
          >
            &#x062A;&#x0644;&#x0627;&#x0634; &#x0645;&#x062C;&#x062F;&#x062F;
          </button>

          {/* Go Home link */}
          <a
            href="/home"
            style={{
              backgroundColor: "transparent",
              color: "#a1a1aa",
              border: "1px solid #27272a",
              borderRadius: "0.75rem",
              padding: "0.75rem 1.5rem",
              fontSize: "1rem",
              fontWeight: 600,
              textDecoration: "none",
              transition: "border-color 0.2s",
            }}
          >
            &#x0628;&#x0627;&#x0632;&#x06AF;&#x0634;&#x062A; &#x0628;&#x0647; &#x062E;&#x0627;&#x0646;&#x0647;
          </a>
        </div>
      </body>
    </html>
  )
}
