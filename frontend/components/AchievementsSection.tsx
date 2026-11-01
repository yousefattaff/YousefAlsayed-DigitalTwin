'use client';

import React, { useEffect, useRef, useState } from 'react';
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
  const [certViewMode, setCertViewMode] = useState<'deck' | 'grid'>('deck');

  const certificateDeckItems: CardDeckItem[] = certificateMedia.map((media) => ({
    id: media.id,
    title: media.title,
    subtitle: media.issuer,
    eyebrow: media.category,
    badgeCode: media.badgeCode,
    gradeLabel: media.type === 'pdf' ? 'CERTIFIED PDF' : 'VERIFIED',
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
                src: graduationProject.model,
                alt: `${graduationProject.title} 3D model`,
                'camera-controls': true,
                'auto-rotate': !reducedMotion,
                'shadow-intensity': '1',
                exposure: '1',
              })}
            </div>
          )}
          {(graduationProject.galleryVideos ?? []).map((video) => (
            <video
              key={video.src}
              className="graduation-gallery-video"
              src={video.src}
              poster={video.poster}
              aria-label={video.title}
              controls
              playsInline
              preload="none"
            >
              Your browser does not support this video.
            </video>
          ))}
          <div className="graduation-photo-row">
            {graduationProject.photos.map((photo, index) => (
              <Image
                key={photo}
                className={index === 0 ? 'graduation-design-render' : undefined}
                src={photo}
                alt={`${graduationProject.title} gallery image ${index + 1}`}
                loading="lazy"
                width={1280}
                height={720}
                sizes="(max-width: 768px) 90vw, 400px"
              />
            ))}
          </div>
        </div>
      </section>

      <section className="resume-extra certificate-media-section">
        <div className="showcase-section-header">
          <div>
            <h2>Certifications &amp; Credentials</h2>
            <p className="certificate-media-intro">
              Flip through the interactive credential deck or switch to grid view to inspect all {certificateMedia.length} certificates.
            </p>
          </div>
          <div className="showcase-view-toggle" role="group" aria-label="Certifications layout view">
            <button
              type="button"
              className={`showcase-toggle-btn${certViewMode === 'deck' ? ' is-active' : ''}`}
              onClick={() => setCertViewMode('deck')}
              aria-pressed={certViewMode === 'deck'}
            >
              3D Card Deck
            </button>
            <button
              type="button"
              className={`showcase-toggle-btn${certViewMode === 'grid' ? ' is-active' : ''}`}
              onClick={() => setCertViewMode('grid')}
              aria-pressed={certViewMode === 'grid'}
            >
              Grid View ({certificateMedia.length})
            </button>
          </div>
        </div>

        {certViewMode === 'deck' ? (
          <CardDeck items={certificateDeckItems} ariaLabel="Certifications 3D Card Deck" />
        ) : (
          <div className="certificate-media-row">
            {certificateMedia.map((media) => (
              <article className="certificate-media-card" key={media.id}>
                <Image
                  src={media.previewSrc}
                  alt={media.title}
                  loading="lazy"
                  width={1200}
                  height={900}
                  sizes="(max-width: 768px) 90vw, 400px"
                />
                <div className="certificate-media-card-body">
                  <span className="eyebrow">{media.issuer}</span>
                  <h3>{media.title}</h3>
                  <a href={media.src} target="_blank" rel="noreferrer">
                    Open {media.type === 'pdf' ? 'PDF' : 'image'} ↗
                  </a>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </section>
  );
}
