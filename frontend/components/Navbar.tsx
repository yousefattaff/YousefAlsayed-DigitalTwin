'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useModal } from '@/lib/useModal';
import { useReducedMotion } from '@/lib/useReducedMotion';

const navItems = [
  ['Expertise', 'expertise'],
  ['History', 'history'],
  ['Projects', 'projects'],
  ['Digital Twin', 'twin'],
  ['Achievements', 'achievements'],
  ['Resume', 'resume'],
] as const;

function subscribeToScroll(onChange: () => void) {
  window.addEventListener('scroll', onChange, { passive: true });
  return () => window.removeEventListener('scroll', onChange);
}

const getScrolled = () => window.scrollY > 40;
const getServerScrolled = () => false;

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const scrolled = useSyncExternalStore(subscribeToScroll, getScrolled, getServerScrolled);
  const menuRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();
  useModal(menuRef, mobileOpen, () => setMobileOpen(false));

  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 640px)');
    const handleResize = (event: MediaQueryListEvent) => {
      if (event.matches) setMobileOpen(false);
    };
    desktop.addEventListener('change', handleResize);
    return () => desktop.removeEventListener('change', handleResize);
  }, []);

  const scrollToSection = (sectionId: string) => {
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth' });
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
              onClick={() => setMobileOpen((open) => !open)}
              aria-label={mobileOpen ? 'Close mobile menu' : 'Open mobile menu'}
              aria-expanded={mobileOpen}
              aria-controls="mobile-navigation"
              aria-haspopup="dialog"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
            <button
              type="button"
              className="nav-brand-btn"
              onClick={() => scrollToSection('about')}
              aria-label="Scroll to top"
            >
              <span className="nav-brand-monogram" aria-hidden="true">YA</span>
              <span className="nav-brand-wordmark">Yousef.</span>
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
            <a
              href="/figma/style-indigo-brutal.svg"
              target="_blank"
              rel="noreferrer"
              className="nav-link-btn nav-style-link"
            >
              Figma Spec
            </a>
            <a href="mailto:yousefabuelkhear@gmail.com" className="nav-cta-pill">
              Hire me →
            </a>
          </nav>
        </div>
      </header>

      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-[1999]"
            role="presentation"
            onClick={() => setMobileOpen(false)}
          />
          <div ref={menuRef} id="mobile-navigation" className="navigation-bar-responsive" role="dialog" aria-modal="true" aria-labelledby="mobile-menu-title" tabIndex={-1}>
            <div className="mobile-menu-top">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="8" y1="6" x2="21" y2="6" />
                <line x1="8" y1="12" x2="21" y2="12" />
                <line x1="8" y1="18" x2="21" y2="18" />
                <line x1="3" y1="6" x2="3.01" y2="6" />
                <line x1="3" y1="12" x2="3.01" y2="12" />
                <line x1="3" y1="18" x2="3.01" y2="18" />
              </svg>
              <span id="mobile-menu-title">Menu</span>
              <button type="button" className="mobile-menu-close" onClick={() => setMobileOpen(false)}>Close</button>
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
              <a
                href="/figma/style-indigo-brutal.svg"
                target="_blank"
                rel="noreferrer"
                className="mobile-nav-btn"
                onClick={() => setMobileOpen(false)}
              >
                Figma Style Spec
              </a>
            </div>
          </div>
        </>
      )}
    </>
  );
}
