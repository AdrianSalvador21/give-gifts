import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: {
    default: "givegifts — Tu intercambio de regalos, sin enredos",
    template: "%s · givegifts",
  },
  description:
    "Organiza tu intercambio de regalos o amigo secreto con un solo link: sorteo secreto, exclusiones, listas de deseos y buzón anónimo. Gratis y sin cuentas.",
};

export const viewport: Viewport = {
  themeColor: "#8ED462",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es-MX" className={`${inter.variable} antialiased`}>
      <body className="min-h-dvh bg-crema text-tinta">{children}</body>
    </html>
  );
}
