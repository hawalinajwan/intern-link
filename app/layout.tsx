import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { AuthNav } from "@/components/AuthNav";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "intern-link",
  description: "Platform rekrutmen magang modern untuk mahasiswa dan HRD.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id"
      className={`${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-slate-50 text-slate-950">
        <AuthNav />
        <main className="min-h-[calc(100vh-4rem)]">{children}</main>
      </body>
    </html>
  );
}
