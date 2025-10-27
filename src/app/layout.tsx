import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CharacterChat Platform",
  description: "BYOK character chat platform with long-term memory",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
