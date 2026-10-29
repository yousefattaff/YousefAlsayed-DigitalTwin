import Link from 'next/link';
import Image from 'next/image';

const FIGMA_FILE = '/figma/yousef-alsayed-design-system.svg?v=2';

export const metadata = {
  title: 'Design System | Yousef Alsayed Portfolio',
  description: 'Soft Royal design system for Yousef Alsayed’s portfolio: colors, typography, buttons, cards, and frames, with an importable Figma SVG.',
};

const swatches = [
  { ratio: '60% CANVAS', name: 'Warm Alabaster', hex: '#EDEAE2', token: '--bg-canvas', bg: '#EDEAE2', fg: '#1A1D24', usage: 'Page background. Low-glare alternative to pure white.' },
  { ratio: '60% SURFACE', name: 'Soft Paper', hex: '#F7F6F2', token: '--bg-card', bg: '#F7F6F2', fg: '#1A1D24', usage: 'Cards, chat window, and fact cards.' },
  { ratio: '30% SECONDARY', name: 'Muted Royal Blue', hex: '#3B5BDB', token: '--accent-emerald', bg: '#3B5BDB', fg: '#F7F6F2', usage: 'Secondary CTA, portrait card, highlights, and hover shadows.' },
  { ratio: '10% INK', name: 'Soft Charcoal', hex: '#1A1D24', token: '--ink-dark', bg: '#1A1D24', fg: '#F7F6F2', usage: 'Text, 2.5px borders, navbar, and the primary CTA.' },
];

const chips = ['Python', 'FastAPI', 'LangGraph', 'MCP', 'AWS Lambda', 'Docker'];

export default function StyleGuidePage() {
  return (
    <main className="style-sheet-page">
      <div className="style-sheet-shell">
        <header className="style-sheet-header">
          <div>
            <span className="brutal-badge brutal-badge-emerald">DESIGN SYSTEM v2.0</span>
            <h1 className="style-sheet-title">Yousef Alsayed: Portfolio Design System</h1>
            <p className="style-sheet-subtitle">
              Warm Alabaster (<code>#EDEAE2</code>) · Muted Royal Blue (<code>#3B5BDB</code>) · Soft Charcoal (<code>#1A1D24</code>)
            </p>
          </div>
          <div className="hero-cta-row">
            <a href={FIGMA_FILE} download="yousef-alsayed-design-system.svg" className="brutal-btn brutal-btn-primary">
              Download Figma file ↓
            </a>
            <Link href="/" className="brutal-btn brutal-btn-secondary">
              ← Back to portfolio
            </Link>
          </div>
        </header>

        <section className="style-sheet-section">
          <div className="style-sheet-section-head">
            <span className="eyebrow">00 · IMPORTABLE FIGMA ARTBOARD</span>
            <h2>The full sheet, ready for Figma</h2>
            <p className="content-lede">
              Drag the downloaded SVG onto a Figma canvas. Colors, type, button states, navigation, chips, cards, and the desktop and mobile frames come in as named, editable layers.
            </p>
          </div>
          <div className="style-sheet-artboard-preview">
            <Image
              src={FIGMA_FILE}
              alt="Yousef Alsayed portfolio design system artboard"
              width={1600}
              height={3140}
              unoptimized
              style={{ width: '100%', height: 'auto', display: 'block' }}
            />
          </div>
        </section>

        <section className="style-sheet-section">
          <div className="style-sheet-section-head">
            <span className="eyebrow">01 · COLOR SYSTEM</span>
            <h2>60–30–10 palette</h2>
          </div>
          <div className="style-sheet-swatch-grid">
            {swatches.map((swatch) => (
              <article
                key={swatch.name}
                className="style-sheet-swatch-card"
                style={{ backgroundColor: swatch.bg, color: swatch.fg }}
              >
                <span className="style-sheet-swatch-pill">{swatch.ratio}</span>
                <h3>{swatch.name}</h3>
                <code>{swatch.hex} · {swatch.token}</code>
                <p>{swatch.usage}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="style-sheet-section">
          <div className="style-sheet-section-head">
            <span className="eyebrow">02 · COMPONENTS</span>
            <h2>Buttons, badges &amp; chips</h2>
          </div>
          <div className="style-sheet-primitives-grid">
            <div className="style-sheet-primitive-box">
              <h3>Button hierarchy</h3>
              <p>Hover lifts 2px with a deeper shadow. Pressed sinks to a 2px shadow.</p>
              <div className="hero-cta-row">
                <button type="button" className="brutal-btn brutal-btn-primary">Hire me →</button>
                <button type="button" className="brutal-btn brutal-btn-secondary">Chat with my Twin</button>
                <button type="button" className="brutal-btn brutal-btn-outline">View resume</button>
              </div>
            </div>
            <div className="style-sheet-primitive-box">
              <h3>Badges &amp; skill chips</h3>
              <p>Mono labels for meta information and technology tags.</p>
              <div className="hero-cta-row">
                <span className="brutal-badge brutal-badge-emerald">OPEN TO WORK</span>
                <span className="brutal-badge brutal-badge-orange">AI ENGINEER</span>
              </div>
              <div className="hero-cta-row">
                {chips.map((chip) => (
                  <span key={chip} className="chip"><span>{chip}</span></span>
                ))}
              </div>
            </div>
            <div className="style-sheet-primitive-box">
              <h3>Avatars</h3>
              <p>The illustrated avatar is used for the Digital Twin; the photo is used in the hero.</p>
              <div className="style-sheet-avatar-row">
                <Image src="/data/profile/yousef-avatar.svg?v=logo-v2" alt="Illustrated avatar of Yousef" width={112} height={112} />
                <Image src="/data/profile/yousef.jpg" alt="Yousef Alsayed portrait" width={112} height={112} className="style-sheet-photo-sample" />
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
