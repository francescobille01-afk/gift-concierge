import {ClerkProvider} from "@clerk/nextjs";
import type { Metadata } from "next";
import { Cormorant_Garamond, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-cormorant",
  display: "swap",
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Gift Concierge — The perfect gift, every time",
  description:
    "AI-powered gift discovery. Tell us about who you're shopping for, and we'll find what they'll genuinely love.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${cormorant.variable} ${jakarta.variable}`}>
      <body className="font-sans antialiased">
        <ClerkProvider>
          {children}
        </ClerkProvider>
        {/* iubenda cookie consent banner (Cookie Solution) — GDPR/Garante */}
        <script type="text/javascript" src="https://embeds.iubenda.com/widgets/6cd8297e-3942-416c-86d8-4f532d36c95e.js"></script>
      </body>
    </html>
  );
}