import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css" assert { type: "css" };

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// --- UPDATED METADATA BLOCK ---
export const metadata: Metadata = {
  title: "TKMCE Activity Point Tracker",
  description:
    "Comprehensive KTU activity point management for TKMCE students and advisors.",
  icons: {
    icon: "/logo.png", // <--- This tells Chrome to use your new shield logo!
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
