import type { Metadata } from "next";
import "./globals.css";

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
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased" suppressHydrationWarning>
        <main className="min-h-screen flex flex-col">
          {children}
        </main>
      </body>
    </html>
  );
}
