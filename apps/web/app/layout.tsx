import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "AIOS — Agency OS for Claude Code",
    template: "%s | AIOS",
  },
  description:
    "Transform Claude Code from a solo tool into infrastructure for your entire agency.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "https://aios.dev"),
  openGraph: {
    title: "AIOS — Agency OS for Claude Code",
    description:
      "Transform Claude Code from a solo tool into infrastructure for your entire agency.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
