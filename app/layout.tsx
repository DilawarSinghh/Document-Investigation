import "./globals.css";
import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { ThemeToaster } from "@/components/ThemeToaster";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const jetbrains = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains" });

export const metadata: Metadata = {
  title: "Investigator — AI document investigation",
  description: "Ask questions across documents with citations and conflict detection.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${jetbrains.variable} min-h-screen bg-background font-sans text-foreground antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          {children}
          <ThemeToaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
