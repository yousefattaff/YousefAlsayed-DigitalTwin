'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import { useModal } from '@/lib/useModal';
import { useReducedMotion } from '@/lib/useReducedMotion';
import CardDeck, { type CardDeckItem } from '@/components/CardDeck';

export interface ProjectShowcaseItem {
  title: string;
  description: string;
  mock: string;
  image?: string;
  video?: string;
  url?: string;
  role?: string;
  technologies?: string[];
  category?: string;
  highlight?: string;
  whatItDoes?: string;
  architecture?: string[];
  keyFeatures?: string[];
}

function ProjectThumbnail({
  project,
  autoPlay = false,
}: {
  project: ProjectShowcaseItem;
  autoPlay?: boolean;
}) {
  const [fallbackLevel, setFallbackLevel] = useState(0);
  const reducedMotion = useReducedMotion();

  if (project.video && fallbackLevel === 0) {
    return (
      <div className="project-media-wrapper">
        <video
          src={project.video}
          poster={project.image || project.mock}
          className="zoom"
          muted
          loop
          playsInline
          autoPlay={autoPlay && !reducedMotion}
          preload="metadata"
          onMouseEnter={(event) => {
            if (reducedMotion) return;
            void event.currentTarget.play().catch(() => {
              // Autoplay can be declined by the browser; the poster remains visible.
            });
          }}
          onMouseLeave={(e) => {
            const v = e.currentTarget;
            v.pause();
            v.currentTime = 0;
          }}
          onError={() => setFallbackLevel(1)}
        />
      </div>
    );
  }

  if (project.image && fallbackLevel < 2) {
    return (
      <Image
        src={project.image}
        className="zoom"
        alt={project.title}
        width={1200}
        height={675}
        sizes="(max-width: 768px) 88vw, 220px"
        onError={() => setFallbackLevel(2)}
      />
    );
  }

  return (
    <Image
      src={project.mock}
      className="zoom"
      alt={project.title}
      width={1200}
      height={675}
      sizes="(max-width: 768px) 88vw, 220px"
    />
  );
}

export default function Projects({ projects: projectList }: { projects: ProjectShowcaseItem[] }) {
  const [selectedProject, setSelectedProject] = useState<ProjectShowcaseItem | null>(null);
  const dialogRef = useRef<HTMLElement>(null);
  useModal(dialogRef, selectedProject !== null, () => setSelectedProject(null));

  const deckItems: CardDeckItem[] = projectList.map((project, index) => ({
    id: project.title,
    title: project.title,
    subtitle: project.role ? `${project.role} · ${project.description}` : project.description,
    eyebrow: (project.category || project.role || 'AI & Engineering Project').toUpperCase(),
    badgeCode: `#${String(index + 1).padStart(2, '0')}`,
    gradeLabel: project.video ? 'LIVE DEMO' : 'FEATURED',
    chips: project.technologies ?? [],
    highlight: project.highlight,
    steps: project.architecture,
    stackLabel: 'Stack & Tools Used',
    highlights: project.keyFeatures ?? [],
    renderMedia: (isActive) => (
      <ProjectThumbnail project={project} autoPlay={isActive} />
    ),
    primaryAction: project.url
      ? {
          label: 'View GitHub Repository ↗',
          href: project.url,
        }
      : undefined,
    secondaryAction: {
      label: 'More detail →',
      onClick: () => setSelectedProject(project),
    },
  }));

  return (
    <div className="projects-container" id="projects">
      <div className="showcase-section-header">
        <div>
          <h1>Personal Projects</h1>
        </div>
      </div>

      <CardDeck items={deckItems} ariaLabel="Personal Projects" />
      {selectedProject && (
        <div
          className="project-showcase-dialog-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setSelectedProject(null);
          }}
        >
          <section
            ref={dialogRef}
            className="project-showcase-dialog project-dossier-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="project-dialog-title"
            aria-describedby="project-dialog-description"
            tabIndex={-1}
          >
            <button
              type="button"
              className="project-dialog-close"
              onClick={() => setSelectedProject(null)}
              aria-label="Close project details"
            >
              ×
            </button>

            {/* Executive Dossier Header */}
            <div className="project-dialog-header">
              <div className="project-dialog-tags">
                <span className="project-dialog-category">
                  {selectedProject.category || 'AI & SOFTWARE ENGINEERING'}
                </span>
                {selectedProject.role && (
                  <span className="project-dialog-role">{selectedProject.role}</span>
                )}
              </div>
              <h2 id="project-dialog-title">{selectedProject.title}</h2>
            </div>

            {/* Media Showcase */}
            <div className="project-dialog-media">
              <ProjectThumbnail key={selectedProject.title} project={selectedProject} autoPlay />
            </div>

            {/* Highlight Banner */}
            {selectedProject.highlight && (
              <div className="project-dialog-highlight-banner">
                <span className="project-dialog-highlight-icon" aria-hidden="true">⚡</span>
                <strong>{selectedProject.highlight}</strong>
              </div>
            )}

            {/* Structured Dossier Body */}
            <div className="project-dialog-body" id="project-dialog-description">
              {/* Section 1: What It Does & Problem Solved */}
              <div className="project-dialog-section">
                <h3 className="project-dialog-section-title">
                  <span className="project-dialog-section-num">01</span>
                  <span>What it does</span>
                </h3>
                <p className="project-dialog-narrative">
                  {selectedProject.whatItDoes || selectedProject.description}
                </p>
              </div>

              {/* Section 2: Architecture & Workflow */}
              {selectedProject.architecture && selectedProject.architecture.length > 0 && (
                <div className="project-dialog-section">
                  <h3 className="project-dialog-section-title">
                    <span className="project-dialog-section-num">02</span>
                    <span>How it runs</span>
                  </h3>
                  <ol className="project-dialog-pipeline">
                    {selectedProject.architecture.map((step, idx) => (
                      <li key={idx} className="project-dialog-pipeline-step">
                        <span className="pipeline-step-badge">
                          STAGE {String(idx + 1).padStart(2, '0')}
                        </span>
                        <p>{step}</p>
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              {/* Section 3: Engineering Highlights */}
              {selectedProject.keyFeatures && selectedProject.keyFeatures.length > 0 && (
                <div className="project-dialog-section">
                  <h3 className="project-dialog-section-title">
                    <span className="project-dialog-section-num">03</span>
                    <span>Notes</span>
                  </h3>
                  <ul className="project-dialog-highlights">
                    {selectedProject.keyFeatures.map((feat, idx) => (
                      <li key={idx} className="project-dialog-highlight-item">
                        <span className="highlight-bullet" aria-hidden="true">●</span>
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Section 4: Technologies Used */}
              {selectedProject.technologies && selectedProject.technologies.length > 0 && (
                <div className="project-dialog-section">
                  <h3 className="project-dialog-section-title">
                    <span className="project-dialog-section-num">04</span>
                    <span>Technologies &amp; Frameworks</span>
                  </h3>
                  <div className="project-dialog-tech-chips">
                    {selectedProject.technologies.map((tech) => (
                      <span key={tech} className="project-dialog-tech-chip">
                        {tech}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Dialog Footer Actions */}
            <div className="project-dialog-footer">
              {selectedProject.url && (
                <a
                  className="brutal-btn brutal-btn-primary"
                  href={selectedProject.url}
                  target={selectedProject.url.startsWith('#') ? undefined : '_blank'}
                  rel="noreferrer"
                >
                  View GitHub Repository ↗
                </a>
              )}
              <button
                type="button"
                className="brutal-btn brutal-btn-outline"
                onClick={() => setSelectedProject(null)}
              >
                Close Details
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
