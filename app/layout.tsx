import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Orbitron } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { KeyboardProvider } from "@/lib/keyboard";
import { ProfileProvider } from "@/contexts/profile-context";
import { PWAInstallPrompt } from "@/components/ui/pwa-install-prompt";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const orbitron = Orbitron({
  variable: "--font-orbitron",
  subsets: ["latin"],
  weight: ["700"],
});

export const metadata: Metadata = {
  title: "Daygent",
  description: "A Product Management Tool to work with your software developer agents",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Daygent",
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: "website",
    siteName: "Daygent",
    title: "Daygent",
    description: "A Product Management Tool to work with your software developer agents",
  },
  twitter: {
    card: "summary",
    title: "Daygent",
    description: "A Product Management Tool to work with your software developer agents",
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#000000',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${orbitron.variable} antialiased overflow-x-hidden`}
      >
        <ProfileProvider>
          <KeyboardProvider>
            {children}
            <Toaster />
            <PWAInstallPrompt />
          </KeyboardProvider>
        </ProfileProvider>
      </body>
    </html>
  );
}
