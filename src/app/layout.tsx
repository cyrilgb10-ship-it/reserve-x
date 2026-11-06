import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
  metadataBase: new URL("https://reserve-x.com"),
  title: {
    default: "Reserve X",
    template: "%s | Reserve X",
  },
  description:
    "Reserve X facilite vos réservations auprès des professionnels. Découvrez des services, réservez et gérez vos tickets en toute simplicité.",
  applicationName: "Reserve X",
  appleWebApp: {
    capable: true,
    title: "Reserve X",
    statusBarStyle: "default",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="fr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}