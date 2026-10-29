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
    id: 'tiktok-royal-light',
    name: '1. TikTok Off-White & Royal Blue',
    tag: 'Kinda White · Royal Blue · Black',
    canvas: '#F4F5F8',
    secondary: '#2563EB',
    secondaryHover: '#3B82F6',
    accent: '#010101',
    card: '#FFFFFF',
    ink: '#010101',
    muted: '#1E293B',
    border: '#010101',
  },
  {
    id: 'tiktok-royal-dark',
    name: '2. TikTok Black & Royal Blue',
    tag: 'TikTok Black · Royal Blue · Off-White',
    canvas: '#0B0C10',
    secondary: '#2563EB',
    secondaryHover: '#3B82F6',
    accent: '#FE2C55',
    card: '#161823',
    ink: '#F4F5F8',
    muted: '#CBD5E1',
    border: '#F4F5F8',
  },
  {
    id: 'tiktok-neon-glitch',
    name: '3. TikTok Cyan, Royal & Pulse',
    tag: 'Off-White · Electric Blue · Red',
    canvas: '#F1F5F9',
    secondary: '#1D4ED8',
    secondaryHover: '#2563EB',
    accent: '#FE2C55',
    card: '#FFFFFF',
    ink: '#010101',
    muted: '#0F172A',
    border: '#010101',
  },
  {
    id: 'figma-ref',
    name: '4. Figma Original',
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
  {
    id: 'velvet-emerald',
    name: '7. Royal Indigo & Mint',
    tag: 'Indigo · Mint · Tangerine',
    canvas: '#1E1E2F',
    secondary: '#00C6AE',
    secondaryHover: '#2CE5CE',
    accent: '#FF6B35',
    card: '#2A2A40',
    ink: '#F5F3EE',
    muted: '#D2D2E4',
    border: '#F5F3EE',
  },
  {
    id: 'matcha-berry',
    name: '8. Matcha & Wild Berry',
    tag: 'Pistachio · Berry · Ink',
    canvas: '#ECFCCB',
    secondary: '#EC4899',
    secondaryHover: '#F472B6',
    accent: '#84CC16',
    card: '#FFFFFF',
    ink: '#1A2E05',
    muted: '#365314',
    border: '#1A2E05',
  },
  {
    id: 'sapphire-gold',
    name: '9. Royal Sapphire & Gold',
    tag: 'Pearl · Sapphire · Gold',
    canvas: '#F8FAFC',
    secondary: '#2563EB',
    secondaryHover: '#3B82F6',
    accent: '#EAB308',
    card: '#FFFFFF',
    ink: '#0F172A',
    muted: '#334155',
    border: '#0F172A',
  },
  {
    id: 'coral-turquoise',
    name: '10. Miami Pop Brutal',
    tag: 'Blush · Turquoise · Tangerine',
    canvas: '#FFE4E6',
    secondary: '#06B6D4',
    secondaryHover: '#22D3EE',
    accent: '#F97316',
    card: '#FFFFFF',
    ink: '#18181B',
    muted: '#27272A',
    border: '#18181B',
  },
  {
    id: 'acid-violet',
    name: '11. Acid Lime & Violet',
    tag: 'Lime · Ultraviolet · Black',
    canvas: '#D9F99D',
    secondary: '#8B5CF6',
    secondaryHover: '#A78BFA',
    accent: '#111827',
    card: '#FFFFFF',
    ink: '#111827',
    muted: '#1F2937',
    border: '#111827',
  },
  {
    id: 'terracotta-sage',
    name: '12. Warm Sand & Terracotta',
    tag: 'Sand · Terracotta · Teal',
    canvas: '#FDE68A',
    secondary: '#F97316',
    secondaryHover: '#FB923C',
    accent: '#0D9488',
    card: '#FFFBEB',
    ink: '#1C1917',
    muted: '#292524',
    border: '#1C1917',
  },
  {
    id: 'sky-magenta',
    name: '13. Sky & Electric Magenta',
    tag: 'Sky · Hot Pink · Lemon',
    canvas: '#E0F2FE',
    secondary: '#DB2777',
    secondaryHover: '#EC4899',
    accent: '#FACC15',
    card: '#FFFFFF',
    ink: '#0C4A6E',
    muted: '#075985',
    border: '#082F49',
  },
  {
    id: 'monochrome-pop',
    name: '14. Swiss Editorial Red',
    tag: 'Warm Paper · Signal Red · Ink',
    canvas: '#F5F5F4',
    secondary: '#EF4444',
    secondaryHover: '#F87171',
    accent: '#FACC15',
    card: '#FFFFFF',
    ink: '#09090B',
    muted: '#27272A',
    border: '#09090B',
  },
  {
    id: 'cyber-matrix',
    name: '15. Obsidian & Neon Lime',
    tag: 'Carbon · Acid Lime · Cyan',
    canvas: '#111315',
    secondary: '#A3E635',
    secondaryHover: '#BEF264',
    accent: '#06B6D4',
    card: '#1C1F24',
    ink: '#F4F4F5',
    muted: '#D4D4D8',
    border: '#F4F4F5',
  },
  {
    id: 'imperial-burgundy',
    name: '16. Crown Gold & Plum',
    tag: 'Champagne · Royal Plum · Gold',
    canvas: '#FEF3C7',
    secondary: '#9333EA',
    secondaryHover: '#A855F7',
    accent: '#E11D48',
    card: '#FFFFFF',
    ink: '#1E1B4B',
    muted: '#312E81',
    border: '#1E1B4B',
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
  const [activeId, setActiveId] = useState<string>('tiktok-royal-light');
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
