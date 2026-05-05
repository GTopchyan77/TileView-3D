import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Online Tile Room Visualizer",
  description: "Preview floor and wall tiles in realistic room templates before buying.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
