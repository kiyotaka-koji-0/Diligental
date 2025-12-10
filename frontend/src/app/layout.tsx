import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Diligental",
  description: "The next generation of communication.",
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
        <div className="bg-grid-pattern" />
        {children}
      </body>
    </html>
  );
}