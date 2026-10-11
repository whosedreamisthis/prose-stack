import { Suspense } from "react";
import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/navbar";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

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
      className={`${geistSans.variable} ${geistMono.variable} dark h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {/* dynamic: hand the signed-in state to client components on first render, so UserButton hydrates cleanly */}
        <Suspense>
          <ClerkProvider dynamic>
            <TooltipProvider delay={300}>
              <Navbar />
              {children}
            </TooltipProvider>
            <Toaster theme="dark" />
          </ClerkProvider>
        </Suspense>
      </body>
    </html>
  );
}
