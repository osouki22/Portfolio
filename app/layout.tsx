import type { Metadata } from "next";
import { Space_Grotesk } from "next/font/google";
import MeshGradient from "@/components/layout/MeshGradient";
import SmoothScroll from "@/components/layout/SmoothScroll";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-space-grotesk",
});

export const metadata: Metadata = {
  title: "Esteban Souki — Senior Product Designer",
  description:
    "Portfolio of Esteban Souki, Senior Product Designer. Ten+ years across fintech, banking, sports tech, and crypto.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={spaceGrotesk.variable}>
      <body className="font-sans">
        <MeshGradient />
        <SmoothScroll>{children}</SmoothScroll>
      </body>
    </html>
  );
}
