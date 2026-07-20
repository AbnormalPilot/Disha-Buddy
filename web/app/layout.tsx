import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Disha Buddy",
  description: "A Telegram AI buddy that helps Indian students find the right college.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
