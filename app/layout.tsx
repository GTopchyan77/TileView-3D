import type { Metadata } from "next";
import { DocumentLanguageSync } from "@/components/document-language-sync";
import "./globals.css";

export const metadata: Metadata = {
  title: "3D Tile Room Visualizer",
  description: "Preview floor and wall tiles in staged 3D rooms.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <DocumentLanguageSync />
        {children}
      </body>
    </html>
  );
}
