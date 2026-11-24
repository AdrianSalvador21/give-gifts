import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { shantell } from "@/components/ui/fonts";
import { AppAnalytics } from "@/lib/analytics-client";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  applicationName: SITE_NAME,
  title: {
    default: "givegifts — Tu intercambio de regalos, sin enredos",
    template: "%s · givegifts",
  },
  description: SITE_DESCRIPTION,
  openGraph: {
    type: "website",
    locale: "es_MX",
    siteName: SITE_NAME,
    title: "givegifts — Tu intercambio de regalos, sin enredos",
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: "givegifts — Tu intercambio de regalos, sin enredos",
    description: SITE_DESCRIPTION,
  },
  appleWebApp: { title: SITE_NAME },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#8ED462",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es-MX" className={`${inter.variable} ${shantell.variable} antialiased`}>
      <body className="min-h-dvh bg-crema text-tinta">
        {children}
        <AppAnalytics />
      </body>
    </html>
  );
}
