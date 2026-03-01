import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
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
  title: "Bills — Every Bill Tells a Story",
  description:
    "A social network for sharing bills, receipts, and purchase experiences. Share your wins, vent your outrage, remember the moments.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      appearance={{
        variables: {
          colorBackground: "#0a0a0a",
          colorInputBackground: "#1a1a1a",
          colorText: "#ffffff",
          colorTextSecondary: "#a3a3a3",
          colorPrimary: "#fbbf24",
          colorDanger: "#ef4444",
          borderRadius: "0.75rem",
        },
      }}
    >
      <html lang="en" className="dark">
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        >
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
