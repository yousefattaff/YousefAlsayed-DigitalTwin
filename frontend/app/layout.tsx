import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import "./styles/tokens.css";
import "./styles/foundation.css";
import "./styles/navigation.css";
import "./styles/portfolio.css";
import "./styles/telemetry.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Yousef Alsayed Abdelfattah — AI Solutions & Multi-Agent Systems",
  description:
    "Yousef Alsayed Abdelfattah builds AI solutions with LLMs, multi-agent systems, RAG, AI-assisted development, and Python. AI Intern at Arche Robotics with a mechatronics and robotics background.",
  keywords: [
    "Yousef Alsayed",
    "AI Engineer",
    "Software Engineer",
    "Digital Twin",
    "LLM",
    "AI Automation",
    "Multi-Agent Systems",
    "RAG",
    "AI-Assisted Development",
    "LangChain",
    "n8n",
    "FastAPI",
    "AWS",
    "Mechatronics",
  ],
  openGraph: {
    title: "Yousef Alsayed Abdelfattah — AI Engineer",
    description:
      "Explore my AI solutions, agent workflows, RAG projects, and robotics experience, or chat with my portfolio-grounded Digital Twin.",
    type: "website",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        {children}
      </body>
    </html>
  );
}
