import type { Metadata } from "next"
import { LandingHero } from "@/components/landing/landing-hero"

export const metadata: Metadata = {
  title: "رخداد | پلتفرم هوشمند تناسب اندام",
  description: "تمرین، رزرو باشگاه، روتین هوشمند و آنالیز پیشرفت. همه در یک اپ.",
  openGraph: {
    title: "رخداد | پلتفرم هوشمند تناسب اندام",
    description: "تمرین، رزرو باشگاه، روتین هوشمند و آنالیز پیشرفت. همه در یک اپ.",
    type: "website",
    locale: "fa_IR",
  },
}

export default function HomePage() {
  return <LandingHero />
}