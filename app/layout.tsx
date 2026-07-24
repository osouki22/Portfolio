import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Esteban Souki — Senior Product Designer",
  description:
    "Portfolio of Esteban Souki, Senior Product Designer. Ten+ years across fintech, banking, sports tech, and crypto.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
