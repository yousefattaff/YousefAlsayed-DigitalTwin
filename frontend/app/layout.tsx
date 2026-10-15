import type { Metadata } from "next";
import { Inter } from "next/font/google";
import ThemeProvider from "@/components/ThemeProvider";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Yousef Alsayed — AI Software Engineer | Digital Twin",
  description:
    "AI Software Engineer & Mechatronics Graduate specializing in LLMs, cloud architecture, and robotics. Chat with my AI-powered Digital Twin to learn about my experience.",
  keywords: [
    "Yousef Alsayed",
    "AI Engineer",
    "Software Engineer",
    "Digital Twin",
    "LLM",
    "FastAPI",
    "AWS",
    "Mechatronics",
  ],
  openGraph: {
    title: "Yousef Alsayed — AI Software Engineer",
    description:
      "Chat with my AI Digital Twin. Built with Next.js, FastAPI, and AWS.",
    type: "website",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
