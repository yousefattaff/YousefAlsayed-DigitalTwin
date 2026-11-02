'use client';

import React, { useEffect, useRef } from 'react';
import Image from 'next/image';
import { useReducedMotion } from '@/lib/useReducedMotion';
import type { CertificateMedia } from '@/lib/content';
import CardDeck, { type CardDeckItem } from '@/components/CardDeck';

export interface GraduationGalleryVideo {
  src: string;
  poster: string;
  title: string;
}

export interface GraduationAchievement {
  title: string;
  status: string;
  description: string;
  award: string;
  details: string[];
  video: string;
  model: string;
  photos: string[];
  galleryVideos?: GraduationGalleryVideo[];
}

export default function AchievementsSection({
  graduationProject,
  certificateMedia,
}: {
  graduationProject: GraduationAchievement;
  certificateMedia: CertificateMedia[];
}) {
  const modelViewerRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();

  const certificateDeckItems: CardDeckItem[] = certificateMedia.map((media) => ({
    id: media.id,
    title: media.title,
    subtitle: media.issuer,
    eyebrow: media.category,
    badgeCode: media.badgeCode,
    gradeLabel: media.type === 'pdf' ? 'CERTIFIED PDF' : 'VERIFIED',
    chips: media.stack,
    whatItIs: media.whatItIs,
    whatILearned: media.whatILearned,
    highlights: media.highlights,
    whatItIsLabel: 'What This Certificate Covers',
    whatILearnedLabel: 'What I Learned & How I Apply It',
    stackLabel: 'Stack & Concepts Covered',
    renderMedia: () => (
      <Image
        src={media.previewSrc}
        alt={media.title}
        width={1200}
        height={900}
        sizes="(max-width: 768px) 92vw, 540px"
        className="collectible-cert-image"
      />
    ),
    primaryAction: {
      label: media.type === 'pdf' ? 'Open Official PDF ↗' : 'Open Full Certificate ↗',
      href: media.src,
    },
  }));

  useEffect(() => {
    if (!graduationProject.model || !modelViewerRef.current) return;
    const loadViewer = () => import('@google/model-viewer').catch((error) => {
      console.error('Unable to initialize the graduation project 3D viewer.', error);
    });
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        observer.disconnect();
        void loadViewer();
      }
    }, { rootMargin: '300px' });
    observer.observe(modelViewerRef.current);
    return () => observer.disconnect();
  }, [graduationProject.model]);

  return (
    <section id="achievements" className="content-page home-content-section">
      <header className="content-header">
        <h1>Achievements &amp; Certifications</h1>
      </header>

      <section className="resume-extra">
        <h2>Graduation project achievement</h2>
        <div className="achievement-feature">
          <div className="achievement-award">
            <span className="eyebrow">{graduationProject.status}</span>
            <h3>{graduationProject.title}</h3>
            <p>{graduationProject.description}</p>
            <ul className="achievement-details">
              {graduationProject.details.map((detail) => <li key={detail}>{detail}</li>)}
            </ul>
            <strong>{graduationProject.award}</strong>
          </div>
        </div>
        <div ref={modelViewerRef} className="graduation-media-row">
          {graduationProject.model && (
            <div className="graduation-model-viewer">
              {React.createElement('model-viewer', {
                src: `${graduationProject.model}?v=robot-face`,
                alt: `${graduationProject.title} 3D model`,
                'camera-controls': true,
                'auto-rotate': !reducedMotion,
                'shadow-intensity': '1',
                exposure: '1',
              })}
            </div>
          )}
        </div>
      </section>

      <section className="resume-extra certificate-media-section">
        <div className="showcase-section-header">
          <div>
            <h2>Certifications &amp; Credentials</h2>
          </div>
        </div>

        <CardDeck items={certificateDeckItems} ariaLabel="Certifications and Credentials" variant="document" />
      </section>
    </section>
  );
}
