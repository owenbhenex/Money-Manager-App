import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans, Inter } from "next/font/google";
import "./globals.css";

const ibmPlexSans = IBM_Plex_Sans({
  variable: "--font-ibm-plex",
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: "#0A0E27",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: "Lumina Money | AI Personal Finance Copilot",
  description: "Frictionless multimodal expense capture, proactive AI financial advisory, and automated spending rules.",
  keywords: ["personal finance", "ai budget", "expense tracker", "gemini ai", "money manager"],
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${ibmPlexSans.variable} ${inter.variable} dark h-full antialiased`}
      style={{ colorScheme: "dark" }}
    >
      <body className="min-h-full bg-[#0A0E27] text-[#F8FAFC] flex flex-col font-sans selection:bg-[#3B82F6]/30 selection:text-white">
        {children}
      </body>
    </html>
  );
}
