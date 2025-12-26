'use client';

import { Geist, Geist_Mono } from "next/font/google";
import { LazorkitProvider } from "@lazorkit/wallet";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <LazorkitProvider
          rpcUrl={process.env.NEXT_PUBLIC_SOLANA_RPC_URL!}
          portalUrl={process.env.NEXT_PUBLIC_LAZORKIT_PORTAL_URL!}
          paymasterConfig={{
            paymasterUrl: process.env.NEXT_PUBLIC_LAZORKIT_PAYMASTER_URL!
          }}
        >
          {children}
        </LazorkitProvider>
      </body>
    </html>
  );
}
