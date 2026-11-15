import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "The Mirror Directory",
  description: "A private notes room for screenplay drafts.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
