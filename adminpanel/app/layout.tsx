import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "رویداد فیت - پنل مدیریت",
  description: "پنل مدیریت رویداد فیت - ادمین، مربی، دکتر، مدیر باشگاه",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fa" dir="rtl" className="dark">
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/vazirmatn@33.0.3/Vazirmatn-font-face.css"
        />
      </head>
      <body className="font-sans antialiased" style={{ fontFamily: "'Vazirmatn', sans-serif" }}>
        {children}
      </body>
    </html>
  );
}
