import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ShepherdFlow — Sermon follow-up for small churches",
  description:
    "Turn a sermon transcript into a summary, small-group questions, daily devotions, and caring follow-up drafts — with the pastor always in charge.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-shepherd-50 text-stone-800 antialiased">{children}</body>
    </html>
  );
}
