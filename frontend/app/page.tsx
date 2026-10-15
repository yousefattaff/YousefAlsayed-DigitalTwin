'use client';

import Navbar from '@/components/Navbar';
import Hero from '@/components/Hero';
import Expertise from '@/components/Expertise';
import Timeline from '@/components/Timeline';
import Projects from '@/components/Projects';
import ChatWidget from '@/components/ChatWidget';
import Footer from '@/components/Footer';
import { useTheme } from '@/components/ThemeProvider';

export default function Home() {
  const { mode } = useTheme();

  return (
    <div className={`main-container ${mode === 'dark' ? 'dark-mode' : 'light-mode'}`}>
      <Navbar />
      <main>
        <Hero />
        <Expertise />
        <Timeline />
        <Projects />
        <ChatWidget />
      </main>
      <Footer />
    </div>
  );
}