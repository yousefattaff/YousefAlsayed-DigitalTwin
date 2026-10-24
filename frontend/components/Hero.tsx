import Image from 'next/image';
import { LinkedinIcon, GithubIcon } from './Icons';
import type { HomeProfile } from './HomeClient';

export default function Hero({
  profile,
}: {
  profile: HomeProfile;
}) {
  return (
    <div className="hero-wrapper" id="about" style={{ width: '100%', maxWidth: '100%' }}>
      <div className="about-section">
        <div className="image-wrapper">
          <Image src={profile.avatarUrl} alt={profile.displayName} width={150} height={150} preload />
        </div>
        <div className="content">
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
          <h1>{profile.displayName}</h1>
          <p>{profile.headline}</p>

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
      </div>
    </div>
  );
}
