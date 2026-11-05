import type { Metadata } from "next";
import "./globals.css";
import "./styles/fonts.css";
import "./styles/tokens.css";
import "./styles/foundation.css";
import "./styles/navigation.css";
import "./styles/portfolio.css";
import "./styles/telemetry.css";

export const metadata: Metadata = {
  title: "Yousef Alsayed — AI Solutions & Multi-Agent Systems",
  description:
    "Yousef Alsayed builds AI solutions with LLMs, multi-agent systems, RAG, AI-assisted development, and Python. AI Intern at Arche Robotics with a mechatronics and robotics background.",
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
    title: "Yousef Alsayed — AI Engineer",
    description:
      "Explore my AI solutions, agent workflows, RAG projects, and robotics experience, or chat with my portfolio-grounded Digital Twin.",
    type: "website",
  },
  icons: {
    icon: "/data/profile/yousef-avatar.svg?v=logo-v3",
    shortcut: "/data/profile/yousef-avatar.svg?v=logo-v3",
    apple: "/data/profile/yousef-avatar.svg?v=logo-v3",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <head>
        <link rel="preload" href="/fonts/inter-latin.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        <link rel="preload" href="/fonts/montserrat-latin.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
      </head>
      <body className="min-h-full flex flex-col">
        {children}
      </body>
    </html>
  );
}
