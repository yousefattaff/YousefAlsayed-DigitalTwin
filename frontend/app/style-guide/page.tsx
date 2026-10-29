import Link from 'next/link';
import Image from 'next/image';

export const metadata = {
  title: 'Style – Indigo Brutal | Figma Style Sheet & Design System',
  description: '60-30-10 Neo-Brutalist Figma style sheet for Yousef Alsayed — Indigo Night, Royal Amethyst, and Electric Orange.',
};

const swatches = [
  {
    ratio: '60% DOMINANT',
    name: 'Indigo Night',
    hex: '#1E1E2F',
    token: '--bg-canvas',
    bg: '#1E1E2F',
    fg: '#F5F3EE',
    border: '#F5F3EE',
    shadow: '6px 6px 0px #A875FF',
    contrast: '13.8:1 with Warm Paper (AAA)',
    usage: 'Main canvas background, primary sections, and dark ink text on royal/orange fills.',
  },
  {
    ratio: 'SURFACE',
    name: 'Indigo Slate',
    hex: '#2A2A40',
    token: '--bg-surface',
    bg: '#2A2A40',
    fg: '#F5F3EE',
    border: '#A875FF',
    shadow: '6px 6px 0px #A875FF',
    contrast: '10.4:1 with Warm Paper (AAA)',
    usage: 'Raised cards, terminal console, navbar pill, and modal surfaces.',
  },
  {
    ratio: '30% SECONDARY',
    name: 'Royal Amethyst',
    hex: '#A875FF',
    token: '--accent-emerald',
    bg: '#A875FF',
    fg: '#1E1E2F',
    border: '#1E1E2F',
    shadow: '6px 6px 0px #FF6B35',
    contrast: '5.1:1 with Indigo Night ink (AA)',
    usage: 'Hero portrait card, feature headers, secondary CTA, Twin assistant bubbles, and offset shadows.',
  },
  {
    ratio: '10% ACCENT',
    name: 'Electric Orange',
    hex: '#FF6B35',
    token: '--accent-orange',
    bg: '#FF6B35',
    fg: '#1E1E2F',
    border: '#1E1E2F',
    shadow: '6px 6px 0px #A875FF',
    contrast: '5.8:1 with Indigo Night ink (AA)',
    usage: 'Primary "Hire me" CTA, active badges, visitor chat bubbles, and keyboard focus rings.',
  },
];

export default function StyleGuidePage() {
  return (
    <main className="style-sheet-page">
      <div className="style-sheet-shell">
        <header className="style-sheet-header">
          <div>
            <span className="brutal-badge brutal-badge-orange">FIGMA DESIGN SPEC v1.0</span>
            <h1 className="style-sheet-title">Style – Indigo Brutal</h1>
            <p className="style-sheet-subtitle">
              60% Indigo Night (<code>#1E1E2F</code>) · 30% Royal Amethyst (<code>#A875FF</code>) · 10% Electric Orange (<code>#FF6B35</code>)
            </p>
          </div>
          <div className="hero-cta-row">
            <a
              href="/figma/style-indigo-brutal.svg?v=royal"
              download="style-indigo-brutal.svg"
              className="brutal-btn brutal-btn-primary"
            >
              Download Figma SVG File ↓
            </a>
            <Link href="/" className="brutal-btn brutal-btn-secondary">
              ← Back to Live Portfolio
            </Link>
          </div>
        </header>

        {/* Frame 1: Full Vector Artboard Preview */}
        <section className="style-sheet-section">
          <div className="style-sheet-section-head">
            <span className="eyebrow">FRAME 00 · IMPORTABLE FIGMA ARTBOARD</span>
            <h2>Complete Vector Figma Sheet (Drag &amp; Drop into Figma)</h2>
            <p className="content-lede">
              Drop <code>/figma/style-indigo-brutal.svg</code> directly onto any Figma canvas — every swatch, button, card, and hero frame is grouped and named as editable vector layers.
            </p>
          </div>
          <div className="style-sheet-artboard-preview">
            <Image
              src="/figma/style-indigo-brutal.svg?v=royal"
              alt="Style – Indigo Brutal complete Figma artboard"
              width={1600}
              height={2180}
              unoptimized
              style={{ width: '100%', height: 'auto', display: 'block' }}
            />
          </div>
        </section>

        {/* Frame 2: 60-30-10 Swatches */}
        <section className="style-sheet-section">
          <div className="style-sheet-section-head">
            <span className="eyebrow">FRAME 01 · COLOR SYSTEM</span>
            <h2>60–30–10 Palette &amp; Contrast Rules</h2>
          </div>
          <div className="style-sheet-swatch-grid">
            {swatches.map((swatch) => (
              <article
                key={swatch.name}
                className="style-sheet-swatch-card"
                style={{
                  backgroundColor: swatch.bg,
                  color: swatch.fg,
                  borderColor: swatch.border,
                  boxShadow: swatch.shadow,
                }}
              >
                <span className="style-sheet-swatch-pill">{swatch.ratio}</span>
                <h3>{swatch.name}</h3>
                <code>{swatch.hex} · {swatch.token}</code>
                <p>{swatch.usage}</p>
                <strong>{swatch.contrast}</strong>
              </article>
            ))}
          </div>
        </section>

        {/* Frame 3: Dual Identity (Photo + Illustrated Avatar) & Interactive Primitives */}
        <section className="style-sheet-section">
          <div className="style-sheet-section-head">
            <span className="eyebrow">FRAME 02 · AVATAR &amp; INTERACTIVE STATES</span>
            <h2>Hero Photo + Digital Twin Illustrated Avatar &amp; Buttons</h2>
          </div>
          <div className="style-sheet-primitives-grid">
            <div className="style-sheet-primitive-box">
              <h3>Illustrated Twin Avatar</h3>
              <p>Used in the hero badge and the AI Digital Twin chat header.</p>
              <div className="style-sheet-avatar-row">
                <Image
                  src="/data/profile/yousef-avatar.svg?v=royal"
                  alt="Illustrated avatar of Yousef"
                  width={112}
                  height={112}
                />
                <Image
                  src="/data/profile/yousef.jpg"
                  alt="Yousef Alsayed portrait"
                  width={112}
                  height={112}
                  className="style-sheet-photo-sample"
                />
              </div>
            </div>
            <div className="style-sheet-primitive-box">
              <h3>CTA Hierarchy (Hover &amp; Press)</h3>
              <p>Hover lifts 2px with an 8px hard shadow; active press snaps down to 2px.</p>
              <div className="hero-cta-row">
                <button type="button" className="brutal-btn brutal-btn-primary">
                  Hire me →
                </button>
                <button type="button" className="brutal-btn brutal-btn-secondary">
                  Chat with my Twin
                </button>
                <button type="button" className="brutal-btn brutal-btn-outline">
                  Download CV ↓
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
