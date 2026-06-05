import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Brass Tacks | Resume Generator",
  description: "A precise, local-first resume generator built on your real professional history. No hallucination, no homogenization.",
  keywords: ["resume", "resume generator", "career", "job application", "cover letter"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`} suppressHydrationWarning>
      <body className="antialiased" suppressHydrationWarning>
        <main className="min-h-screen flex flex-col">
          {children}
        </main>
      </body>
    </html>
  );
}
