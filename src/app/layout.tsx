import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Link from "next/link";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Admin CMS",
  description: "Manage companies, users, and JWTs",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-gray-50 text-gray-900`}
      >
        <header className="bg-white border-b shadow-sm">
          <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between">
            <h1 className="text-lg font-semibold">Admin CMS</h1>
            <nav className="space-x-4 text-sm">
              <Link href="/" className="hover:underline">
                Home
              </Link>
              <Link href="/companies" className="hover:underline">
                Companies
              </Link>
              <Link href="/users" className="hover:underline">
                Users
              </Link>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
