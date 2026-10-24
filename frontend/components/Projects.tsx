'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import { useModal } from '@/lib/useModal';
import { useReducedMotion } from '@/lib/useReducedMotion';

export interface ProjectShowcaseItem {
  title: string;
  description: string;
  mock: string;
  image?: string;
  video?: string;
  url?: string;
}

function ProjectThumbnail({ project }: { project: ProjectShowcaseItem }) {
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

  return (
    <div className="projects-container" id="projects">
      <h1>Personal Projects</h1>
      <p className="project-showcase-count" aria-live="polite">
        Showing {projectList.length} projects
      </p>
      <div className="projects-grid">
        {projectList.map((project) => (
          <div key={project.title} className="project">
            <a
              href={project.url || '#projects'}
              target={project.url?.startsWith('#') ? undefined : '_blank'}
              rel="noreferrer"
            >
              <ProjectThumbnail project={project} />
            </a>
            <a
              href={project.url || '#projects'}
              target={project.url?.startsWith('#') ? undefined : '_blank'}
              rel="noreferrer"
            >
              <h2>{project.title}</h2>
            </a>
            <p>{project.description}</p>
            <button
              type="button"
              className="project-details-trigger"
              onClick={() => setSelectedProject(project)}
              aria-label={`View details for ${project.title}`}
            >
              View project details
            </button>
          </div>
        ))}
      </div>
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
            className="project-showcase-dialog"
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
            <h2 id="project-dialog-title">{selectedProject.title}</h2>
            <div className="project-dialog-media">
              <ProjectThumbnail key={selectedProject.title} project={selectedProject} />
            </div>
            <p id="project-dialog-description">{selectedProject.description}</p>
            <a
              className="project-dialog-link"
              href={selectedProject.url || '#projects'}
              target={selectedProject.url?.startsWith('#') ? undefined : '_blank'}
              rel="noreferrer"
            >
              Open project link
            </a>
          </section>
        </div>
      )}
    </div>
  );
}
