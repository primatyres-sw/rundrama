import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RunDrama",
  description: "A running-unlocked vertical drama prototype.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
