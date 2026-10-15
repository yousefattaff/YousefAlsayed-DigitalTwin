'use client';

export default function About() {
  return (
    <section id="about" className="relative py-28 px-6">
      <div className="glow-line max-w-2xl mx-auto mb-20" />

      <div className="max-w-4xl mx-auto">
        {/* Heading */}
        <div className="text-center mb-10">
          <p className="section-heading">About Me</p>
          <h2 className="text-3xl sm:text-4xl font-bold">
            Engineering <span className="gradient-text">Intelligence</span>
          </h2>
        </div>

        {/* Bio */}
        <div className="glass-card p-8 sm:p-10 animate-fade-in-up">
          <div className="flex flex-col sm:flex-row gap-8 items-start">
            <img
              src="/yousef.jpg"
              alt="Yousef Alsayed"
              className="w-28 h-28 rounded-2xl object-cover flex-shrink-0 border"
              style={{ borderColor: 'var(--border-subtle)' }}
            />
            <div>
              <p className="leading-relaxed mb-4" style={{ color: 'var(--text-secondary)' }}>
                I&apos;m an AI &amp; Software Engineer with a Mechatronics degree from Misr University for Science &amp; Technology (MUST).
                I combine disciplined engineering fundamentals with modern AI application development,
                specializing in taking intelligent systems from prototype to production.
              </p>
              <p className="leading-relaxed mb-4" style={{ color: 'var(--text-secondary)' }}>
                Currently, I&apos;m developing cutting-edge AI solutions at <strong style={{ color: 'var(--accent-primary)' }}>Arche Robotics</strong> in Istanbul
                while teaching programming at <strong style={{ color: 'var(--accent-primary)' }}>iSchool</strong> in Cairo. My work spans LLMs,
                autonomous agents, FastAPI backends, Docker, and AWS serverless architectures.
              </p>
              <p className="leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                I hold certifications from Harvard (CS50 AI), DeepLearning.AI (Machine Learning),
                and Siemens (PLC Industrial Automation). I&apos;m passionate about building systems
                that are not just smart, but reliable, scalable, and useful in the real world.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
