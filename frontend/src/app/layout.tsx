import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import "@/styles/glassmorphism.css";
import { ThemeProvider } from "@/contexts/theme-context";
import PWARegister from "@/components/pwa-register";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Diligental",
  description: "The next generation of communication.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Diligental",
  },
  formatDetection: {
    telephone: false,
  },
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  },
  icons: [
    {
      rel: "icon",
      url: "/favicon.ico",
    },
    {
      rel: "apple-touch-icon",
      url: "/apple-touch-icon.png",
      sizes: "180x180",
    },
    {
      rel: "icon",
      url: "/icon-192.png",
      sizes: "192x192",
      type: "image/png",
    },
    {
      rel: "icon",
      url: "/icon-512.png",
      sizes: "512x512",
      type: "image/png",
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" style={{ height: '100%' }}>
      <body
        className={`${outfit.variable} font-sans antialiased`}
        style={{ height: '100%', margin: 0, padding: 0 }}
      >
        <ThemeProvider>
          <PWARegister />
          <div className="bg-grid-pattern" />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}