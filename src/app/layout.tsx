import type { Metadata } from "next";
import localFont from "next/font/local";
import { AuthProviders } from "@/components/auth/providers";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "SpendWise — Personal Spending Tracker",
  description: "Track accounts, transactions, and spending with a polished modern finance UI.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark">
      <body className={`${geistSans.variable} ${geistMono.variable} min-h-screen bg-[#070b14] font-sans antialiased`}>
        <AuthProviders>{children}</AuthProviders>
      </body>
    </html>
  );
}
