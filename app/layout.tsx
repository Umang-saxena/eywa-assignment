import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import {Toaster} from "@/components/ui/sonner"
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Chat-Pdf - Your Documents, Answered",
  description: "Organize documents in folders and get instant, accurate answers from your content. Every response backed by precise citations.",
  keywords: ["document management", "AI chat", "Q&A", "citations", "PDF", "file organization"],
  openGraph: {
    title: "Chat-Pdf - Your Documents, Answered",
    description: "Organize documents in folders and get instant, accurate answers from your content. Every response backed by precise citations.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Chat-Pdf - Your Documents, Answered",
    description: "Organize documents in folders and get instant, accurate answers from your content. Every response backed by precise citations.",
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
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}
