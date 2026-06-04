import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
const inter = Inter({ subsets: ["latin"] });
export const metadata: Metadata = {
  title: "Arc Chat — On-Chain Messaging",
  description: "Chat rooms on Arc Network. Messages live forever on-chain.",
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-gray-950 text-white antialiased min-h-screen`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
