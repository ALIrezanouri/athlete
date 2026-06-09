import type { Metadata } from "next";
import localFont from "next/font/local";
import { GlobalEngineProvider } from "@/lib/GlobalEngineContext";
import { ThemeProvider } from "@/lib/ThemeProvider";
import { SWRegister } from "@/components/pwa/sw-register";
import "./globals.css";

const geistSans = localFont({
  src: [
    { path: "../public/fonts/geist-400.woff2", weight: "400" },
    { path: "../public/fonts/geist-700.woff2", weight: "700" },
  ],
  variable: "--font-geist-sans",
});

const geistMono = localFont({
  src: [
    { path: "../public/fonts/geist-mono-400.woff2", weight: "400" },
    { path: "../public/fonts/geist-mono-700.woff2", weight: "700" },
  ],
  variable: "--font-geist-mono",
});

const vazirmatn = localFont({
  src: [
    { path: "../public/fonts/vazirmatn-400.woff2", weight: "400" },
    { path: "../public/fonts/vazirmatn-700.woff2", weight: "700" },
  ],
  variable: "--font-vazirmatn",
});

export const metadata: Metadata = {
  title: "rokhdad FIT — Athlete Portal",
  description: "Gym Global Athlete PWA",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fa"
      dir="rtl"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${vazirmatn.variable} dark h-full antialiased`}
    >
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <SWRegister />
        <GlobalEngineProvider>
          <ThemeProvider>{children}</ThemeProvider>
        </GlobalEngineProvider>
      </body>
    </html>
  );
}
