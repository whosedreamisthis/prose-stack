import { Suspense } from "react";
import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { DemoBanner } from "@/components/demo/DemoBanner";
import { Navbar } from "@/components/navbar";
import { ThemeSyncLoader } from "@/components/theme/ThemeSyncLoader";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { THEME_SCRIPT } from "@/lib/theme-config";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ProseStack",
  description: "A writing workspace for novels and long-form fiction.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      // the head script puts the theme class on <html> before React hydrates
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col">
        {/* dynamic: hand the signed-in state to client components on first render, so UserButton hydrates cleanly */}
        <Suspense>
          <ClerkProvider dynamic>
            <Suspense>
              <ThemeSyncLoader />
            </Suspense>
            <TooltipProvider delay={300}>
              <Navbar />
              <Suspense>
                <DemoBanner />
              </Suspense>
              {children}
            </TooltipProvider>
            <Toaster />
          </ClerkProvider>
        </Suspense>
      </body>
    </html>
  );
}
