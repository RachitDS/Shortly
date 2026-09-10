import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
export const metadata: Metadata = {
  title: "Shortly — Small links. Big possibilities.",
  description: "Shorten, share, and track your links. A complete URL shortening service built with Next.js and PostgreSQL.",
};
export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
