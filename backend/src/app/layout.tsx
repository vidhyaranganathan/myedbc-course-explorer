export const metadata = {
  title: "BC Course Finder API",
  description: "API backend for BC Course Finder",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
