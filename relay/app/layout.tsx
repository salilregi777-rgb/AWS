import type { Metadata } from "next";
import "./globals.css";
import "./atmosphere.css";
import "./waves.css";

export const metadata: Metadata = {
  title: "Relay — Community response, connected",
  description: "Turn community signals into coordinated care. A local response workspace with explainable team matching and AWS Cedar policy checks.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased">{children}</body>
    </html>
  );
}
