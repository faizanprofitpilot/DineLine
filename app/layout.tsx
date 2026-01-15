import type { Metadata } from "next";
import { Source_Sans_3 } from "next/font/google";
import "./globals.css";

const sourceSans3 = Source_Sans_3({
  variable: "--font-sans",
  subsets: ["latin"],
  display: 'swap',
  weight: ['300', '400', '500', '600', '700', '800', '900'],
  fallback: ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
});

export const metadata: Metadata = {
  title: "DineLine - AI Voice Receptionist for Restaurants",
  description: "Never miss a restaurant phone order again. AI voice agent answers calls, captures orders, and sends them directly to your kitchen email + dashboard.",
  icons: {
    icon: '/icon.png',
    apple: '/icon.png',
    shortcut: '/icon.png',
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
        className={`${sourceSans3.variable} antialiased`}
        style={{ fontFamily: 'var(--font-sans)' }}
      >
        {children}
      </body>
    </html>
  );
}
