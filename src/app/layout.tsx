import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BC Course Finder - Modern Search for BC High School Courses",
  description:
    "Find BC high school courses instantly with AI-powered search. Official BC Ministry of Education course data, made easy to search and understand.",
  keywords: "BC courses, high school courses BC, BC course registry, BC education",
  openGraph: {
    title: "BC Course Finder",
    description: "Modern, AI-powered search for BC's official course registry",
    type: "website",
  },
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
