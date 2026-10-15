'use client';

import React, { useEffect, useState } from 'react';
import { useTheme } from './ThemeProvider';

const navItems = [
  ['Expertise', 'expertise'],
  ['History', 'history'],
  ['Projects', 'projects'],
  ['Digital Twin', 'twin'],
];

export default function Navbar() {
  const { mode, toggleTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 40);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (sectionId: string) => {
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <>
      <header className={`navigation-bar-container${scrolled ? ' scrolled' : ''}`}>
        <div className="navigation-bar" id="navigation">
          {/* Mobile hamburger menu toggle */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="sm:hidden p-2 text-inherit"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Open mobile menu"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>

            {/* Mode toggle */}
            <button
              type="button"
              onClick={toggleTheme}
              className="p-1.5 transition-colors"
              aria-label={`Switch to ${mode === 'dark' ? 'light' : 'dark'} mode`}
            >
              {mode === 'dark' ? (
                /* Sun icon for dark mode (click to switch to light) */
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="5" />
                  <line x1="12" y1="1" x2="12" y2="3" />
                  <line x1="12" y1="21" x2="12" y2="23" />
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                  <line x1="1" y1="12" x2="3" y2="12" />
                  <line x1="21" y1="12" x2="23" y2="12" />
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                </svg>
              ) : (
                /* Moon icon for light mode (click to switch to dark) */
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              )}
            </button>
          </div>

          {/* Desktop links */}
          <nav className="hidden sm:flex items-center gap-1">
            {navItems.map(([label, id]) => (
              <button
                key={id}
                type="button"
                className="nav-link-btn"
                onClick={() => scrollToSection(id)}
              >
                {label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-[1999]"
            onClick={() => setMobileOpen(false)}
          />
          <div className="navigation-bar-responsive">
            <div className="mobile-menu-top">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="8" y1="6" x2="21" y2="6" />
                <line x1="8" y1="12" x2="21" y2="12" />
                <line x1="8" y1="18" x2="21" y2="18" />
                <line x1="3" y1="6" x2="3.01" y2="6" />
                <line x1="3" y1="12" x2="3.01" y2="12" />
                <line x1="3" y1="18" x2="3.01" y2="18" />
              </svg>
              <span>Menu</span>
            </div>
            <div className="mobile-nav-list">
              {navItems.map(([label, id]) => (
                <button
                  key={id}
                  type="button"
                  className="mobile-nav-btn"
                  onClick={() => {
                    scrollToSection(id);
                    setMobileOpen(false);
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </>
  );
}
