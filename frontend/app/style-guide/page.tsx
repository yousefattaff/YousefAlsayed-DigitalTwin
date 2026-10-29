import Link from 'next/link';
import Image from 'next/image';

export const metadata = {
  title: 'Figma Reference Style Sheet | Sunshine Yellow, Mint-Teal & Jet Black',
  description: 'Neo-Brutalist Figma style sheet matching the community portfolio reference (#FFDD55, #00C6AE, #000000, #FFFFFF).',
};

const swatches = [
  {
    ratio: '60% DOMINANT',
    name: 'Sunshine Yellow',
    hex: '#FFDD55',
    token: '--bg-canvas',
    bg: '#FFDD55',
    fg: '#000000',
    border: '#000000',
    shadow: '6px 6px 0px #000000',
    contrast: '15.4:1 with Jet Black ink (AAA)',
    usage: 'Main portfolio canvas background and monogram badge fill in the black navbar.',
  },
  {
    ratio: '30% SECONDARY',
    name: 'Mint-Teal',
    hex: '#00C6AE',
    token: '--accent-emerald',
    bg: '#00C6AE',
    fg: '#000000',
    border: '#000000',
    shadow: '6px 6px 0px #000000',
    contrast: '9.4:1 with Jet Black ink (AAA)',
    usage: 'Hero portrait card fill, hard offset button shadows, skill icon badges, and Twin accents.',
  },
  {
    ratio: '10% INK & CTAS',
    name: 'Jet Black',
    hex: '#000000',
    token: '--ink-dark',
    bg: '#000000',
    fg: '#FFFFFF',
    border: '#000000',
    shadow: '6px 6px 0px #00C6AE',
    contrast: '21:1 with Crisp White (AAA)',
    usage: 'Top navbar bar, primary CTA buttons (Hire me, Download CV), 3px outlines, and hard card shadows.',
  },
  {
    ratio: 'CARDS & SOCIAL',
    name: 'Crisp White',
    hex: '#FFFFFF',
    token: '--bg-card',
    bg: '#FFFFFF',
    fg: '#000000',
    border: '#000000',
    shadow: '6px 6px 0px #000000',
    contrast: '21:1 with Jet Black ink (AAA)',
    usage: 'Circular social icon buttons, expertise/project/timeline cards, and Twin chat surfaces.',
  },
];

export default function StyleGuidePage() {
  return (
    <main className="style-sheet-page">
      <div className="style-sheet-shell">
        <header className="style-sheet-header">
          <div>
            <span className="brutal-badge brutal-badge-orange">FIGMA DESIGN SPEC v1.0</span>
            <h1 className="style-sheet-title">Figma Reference Style Sheet</h1>
            <p className="style-sheet-subtitle">
              60% Sunshine Yellow (<code>#FFDD55</code>) · 30% Mint-Teal (<code>#00C6AE</code>) · 10% Jet Black (<code>#000000</code>) &amp; White (<code>#FFFFFF</code>)
            </p>
          </div>
          <div className="hero-cta-row">
            <a
              href="/figma/style-indigo-brutal.svg?v=figma-ref"
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
              src="/figma/style-indigo-brutal.svg?v=figma-ref"
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
                  src="/data/profile/yousef-avatar.svg?v=figma-ref"
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
