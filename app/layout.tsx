import type { Metadata } from "next";
import { Inter, Roboto } from "next/font/google";
import "./globals.css";

{/*prevents hydration error*/}
import Script from "next/script"; 

const inter = Inter({ subsets: ["latin"] });
const roboto = Roboto({subsets: ["latin"], weight: "700"});

export const metadata: Metadata = {
  title: "BrokerNest.ai",
  description: "AI CRM Dialer",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* Required for pricing table */}
        <Script
          src="https://js.stripe.com/v3/pricing-table.js"
          strategy = "afterInteractive"
        />
      </head>
      
      <body className={inter.className}>{children}</body>
    </html>
  );
}
