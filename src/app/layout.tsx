import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BC Course Finder",
  description: "Search and explore British Columbia's 12,741 courses",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
