import type { Metadata } from "next";
import { Inter, Newsreader } from "next/font/google";
import "./globals.css";

// Self-hosted at build time via next/font/google — no runtime font CDN.
const newsreader = Newsreader({
  subsets: ["latin"],
  variable: "--font-newsreader",
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "ShepherdFlow — Sermon follow-up for small churches",
  description:
    "Turn a sermon transcript into a summary, small-group questions, daily devotions, and caring follow-up drafts — with the pastor always in charge.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${newsreader.variable} ${inter.variable}`}>
      <body className="bg-bulletin-bg font-serif text-bulletin-ink antialiased dark:bg-bulletin-bgDark dark:text-bulletin-inkDark">
        {children}
      </body>
    </html>
  );
}
