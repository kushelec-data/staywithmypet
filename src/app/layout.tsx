import type { Metadata } from "next";
import { Inter, Poppins } from "next/font/google";
import { MetaPixel } from "@/components/analytics/MetaPixel";
import { ConsentAwareAnalytics } from "@/components/cookies/ConsentAwareAnalytics";
import { CookieConsentMount } from "@/components/cookies/CookieConsentMount";
import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { AuthProvider } from "@/context/AuthContext";
import { LanguageProvider } from "@/context/LanguageContext";
import { FavoritesProvider } from "@/context/FavoritesContext";
import { ProfileProvider } from "@/context/ProfileContext";
import "./globals.css";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: {
    default: "StayWithMyPet — Responsible pet sharing & companionship",
    template: "%s | StayWithMyPet",
  },
  description:
    "Connect Pet Parents and Pet Friends for walks, visits, and home-based companionship — trusted, flexible, and built on real care.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${poppins.variable} ${inter.variable} h-full scroll-smooth overflow-x-hidden`}
    >
      <body className="flex min-h-full flex-col overflow-x-hidden bg-background font-sans text-foreground antialiased">
        <LanguageProvider>
          <AuthProvider>
            <ProfileProvider>
              <FavoritesProvider>
                <Navbar />
                <main className="flex-1">{children}</main>
                <Footer />
              </FavoritesProvider>
            </ProfileProvider>
          </AuthProvider>
          <CookieConsentMount />
        </LanguageProvider>
        <ConsentAwareAnalytics />
        <MetaPixel />
      </body>
    </html>
  );
}
