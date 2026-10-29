export interface AboutFact {
  label: string;
  value: string;
}

export default function AboutMe({
  paragraphs,
  facts,
}: {
  paragraphs: string[];
  facts: AboutFact[];
}) {
  return (
    <section id="about-me" className="content-page home-content-section about-me-section" aria-labelledby="about-me-title">
      <header className="content-header">
        <p className="eyebrow">About me</p>
        <h1 id="about-me-title">A little more about me</h1>
      </header>
      <div className="about-me-grid">
        <div className="about-me-story">
          {paragraphs.map((paragraph) => (
            <p key={paragraph.slice(0, 32)}>{paragraph}</p>
          ))}
        </div>
        <dl className="about-me-facts">
          {facts.map((fact) => (
            <div key={fact.label} className="about-me-fact">
              <dt>{fact.label}</dt>
              <dd>{fact.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
