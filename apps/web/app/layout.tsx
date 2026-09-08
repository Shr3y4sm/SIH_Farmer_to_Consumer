import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FarmIt · From field to Jaynagar",
  description: "A transparent farmer-to-consumer rice delivery prototype.",
  manifest: "/manifest.webmanifest",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}