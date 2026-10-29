import Image from 'next/image';
import { LinkedinIcon, GithubIcon } from './Icons';
import type { HomeProfile } from './HomeClient';

export default function Hero({ profile }: { profile: HomeProfile }) {
  return (
    <div className="hero-wrapper" id="about" style={{ width: '100%', maxWidth: '100%' }}>
      <div className="about-section">
        <div className="content">
          <h1>
            <span className="hero-greeting">Hello, I&apos;m</span>
            <span className="hero-name">{profile.displayName}</span>
          </h1>
          <p>{profile.headline}</p>

          <div className="hero-cta-row">
            <a
              href="mailto:yousefabuelkhear@gmail.com"
              className="brutal-btn brutal-btn-primary"
            >
              Hire me →
            </a>
            <a
              href="#twin"
              className="brutal-btn brutal-btn-secondary"
            >
              Chat with my Twin
            </a>
          </div>

          <div className="social_icons">
            <a
              href={profile.githubUrl}
              target="_blank"
              rel="noreferrer"
              aria-label="GitHub"
            >
              <GithubIcon size={28} />
            </a>
            <a
              href={profile.linkedinUrl}
              target="_blank"
              rel="noreferrer"
              aria-label="LinkedIn"
            >
              <LinkedinIcon size={28} />
            </a>
          </div>

          <div className="mobile_social_icons">
            <a
              href={profile.githubUrl}
              target="_blank"
              rel="noreferrer"
              aria-label="GitHub"
            >
              <GithubIcon size={28} />
            </a>
            <a
              href={profile.linkedinUrl}
              target="_blank"
              rel="noreferrer"
              aria-label="LinkedIn"
            >
              <LinkedinIcon size={28} />
            </a>
          </div>
        </div>

        <div className="image-wrapper">
          <div className="hero-brutal-card">
            <div className="hero-portrait-frame">
              <Image
                src={profile.avatarUrl}
                alt={profile.displayName}
                width={320}
                height={320}
                preload
              />
            </div>
            <a href="#twin" className="hero-avatar-sticker" aria-label="Jump to Yousef's AI Digital Twin">
              <Image
                src="/data/profile/yousef-avatar.svg?v=logo-v2"
                alt="Illustrated avatar of Yousef"
                width={56}
                height={56}
              />
              <div className="hero-avatar-sticker-copy">
                <strong>AI Digital Twin</strong>
                <span>Click to ask me anything →</span>
              </div>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
