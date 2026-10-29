'use client';

import { useState } from 'react';

export interface BrutalPalette {
  id: string;
  name: string;
  tag: string;
  canvas: string;      // 60% background
  secondary: string;   // 30% hero card / secondary
  secondaryHover: string;
  accent: string;      // 10% CTA / highlight
  card: string;        // card surface
  ink: string;         // primary text
  muted: string;       // secondary text
  border: string;      // 3px brutalist border
}

export const PALETTES: BrutalPalette[] = [
  {
    id: 'figma-ref',
    name: '1. Figma Original',
    tag: 'Yellow · Teal · Black',
    canvas: '#FFDD55',
    secondary: '#00C6AE',
    secondaryHover: '#00DFC4',
    accent: '#000000',
    card: '#FFFFFF',
    ink: '#000000',
    muted: '#18191F',
    border: '#000000',
  },
  {
    id: 'royal-gold',
    name: '2. Royal Purple & Gold',
    tag: 'Cream · Royal Purple · Gold',
    canvas: '#FAF3E0',
    secondary: '#8B5CF6',
    secondaryHover: '#A78BFA',
    accent: '#F59E0B',
    card: '#FFFFFF',
    ink: '#14111F',
    muted: '#2E2942',
    border: '#14111F',
  },
  {
    id: 'royal-crimson',
    name: '3. Imperial Lavender',
    tag: 'Lavender · Violet · Rose',
    canvas: '#EDE9FE',
    secondary: '#7C3AED',
    secondaryHover: '#8B5CF6',
    accent: '#F43F5E',
    card: '#FFFFFF',
    ink: '#1E1B4B',
    muted: '#312E81',
    border: '#1E1B4B',
  },
  {
    id: 'cobalt-coral',
    name: '4. Cyber Cobalt & Coral',
    tag: 'Ice · Electric Blue · Coral',
    canvas: '#E0E7FF',
    secondary: '#3B82F6',
    secondaryHover: '#60A5FA',
    accent: '#FF5A36',
    card: '#FFFFFF',
    ink: '#0F172A',
    muted: '#1E293B',
    border: '#0F172A',
  },
  {
    id: 'peach-klein',
    name: '5. Sunset Apricot & Blue',
    tag: 'Apricot · Royal Blue · Lime',
    canvas: '#FFE4B5',
    secondary: '#38BDF8',
    secondaryHover: '#7DD3FC',
    accent: '#4F46E5',
    card: '#FFFFFF',
    ink: '#111827',
    muted: '#1F2937',
    border: '#111827',
  },
  {
    id: 'dark-royal',
    name: '6. Dark Royal & Gold',
    tag: 'Midnight · Amethyst · Gold',
    canvas: '#181326',
    secondary: '#A855F7',
    secondaryHover: '#C084FC',
    accent: '#FBBF24',
    card: '#261F3D',
    ink: '#FAF5FF',
    muted: '#DDD6FE',
    border: '#FAF5FF',
  },
];

function applyPalette(p: BrutalPalette) {
  const root = document.documentElement;
  root.style.setProperty('--bg-canvas', p.canvas);
  root.style.setProperty('--bg-surface', p.card);
  root.style.setProperty('--bg-card', p.card);
  root.style.setProperty('--bg-floating', p.card);
  root.style.setProperty('--bg-card-hover', p.canvas);
  root.style.setProperty('--bg-card-active', p.canvas);
  root.style.setProperty('--accent-emerald', p.secondary);
  root.style.setProperty('--accent-emerald-light', p.secondary);
  root.style.setProperty('--accent-emerald-hover', p.secondaryHover);
  root.style.setProperty('--accent-orange', p.accent);
  root.style.setProperty('--text-primary', p.ink);
  root.style.setProperty('--text-secondary', p.muted);
  root.style.setProperty('--text-detail', p.muted);
  root.style.setProperty('--text-emphasis', p.ink);
  root.style.setProperty('--border-subtle', p.border);
  root.style.setProperty('--border-medium', p.border);
  root.style.setProperty('--border-hover', p.border);
  root.style.setProperty('--border-zinc', p.border);
}

export default function PaletteSwitcher() {
  const [activeId, setActiveId] = useState<string>('figma-ref');
  const [collapsed, setCollapsed] = useState(false);

  const handleSelect = (p: BrutalPalette) => {
    setActiveId(p.id);
    applyPalette(p);
  };

  return (
    <section className="palette-Audit-dock" aria-label="Visual color palette picker">
      <div className="palette-dock-header">
        <div>
          <span className="palette-dock-eyebrow">LIVE COLOR PALETTE STUDIO (60–30–10)</span>
          <h2 className="palette-dock-title">Click any visual palette below to test it live</h2>
        </div>
        <button
          type="button"
          className="palette-dock-toggle"
          onClick={() => setCollapsed((c) => !c)}
        >
          {collapsed ? 'Show Palettes ▼' : 'Hide Palettes ▲'}
        </button>
      </div>

      {!collapsed && (
        <div className="palette-swatch-grid">
          {PALETTES.map((p) => {
            const isSelected = p.id === activeId;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => handleSelect(p)}
                className={`palette-card-btn${isSelected ? ' is-selected' : ''}`}
              >
                {/* Visual 60-30-10 color bar */}
                <div className="palette-color-strip" aria-hidden="true">
                  <span
                    className="palette-strip-60"
                    style={{ backgroundColor: p.canvas }}
                    title={`60% Canvas: ${p.canvas}`}
                  >
                    <em style={{ color: p.ink }}>60%</em>
                  </span>
                  <span
                    className="palette-strip-30"
                    style={{ backgroundColor: p.secondary }}
                    title={`30% Secondary: ${p.secondary}`}
                  >
                    <em style={{ color: '#000000' }}>30%</em>
                  </span>
                  <span
                    className="palette-strip-10"
                    style={{ backgroundColor: p.accent }}
                    title={`10% Accent: ${p.accent}`}
                  >
                    <em style={{ color: p.accent === '#000000' ? '#FFFFFF' : '#000000' }}>10%</em>
                  </span>
                </div>

                {/* Swatch circles + labels */}
                <div className="palette-card-meta">
                  <div className="palette-card-dots" aria-hidden="true">
                    <span style={{ backgroundColor: p.canvas }} />
                    <span style={{ backgroundColor: p.secondary }} />
                    <span style={{ backgroundColor: p.accent }} />
                    <span style={{ backgroundColor: p.card }} />
                  </div>
                  <div className="palette-card-text">
                    <strong>{p.name}</strong>
                    <span>{p.tag}</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
