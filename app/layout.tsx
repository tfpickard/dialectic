import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Perpetual Dialectic Machine",
  description: "An endless debate between two AI agents",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
