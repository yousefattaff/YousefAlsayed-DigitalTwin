'use client';

import React from 'react';
import { LinkedinIcon, GithubIcon } from './Icons';

export default function Hero() {
  return (
    <div className="hero-wrapper" id="about" style={{ width: '100%', maxWidth: '100%' }}>
      <div className="about-section">
        <div className="image-wrapper">
          <img src="/yousef.jpg" alt="Avatar" />
        </div>
        <div className="content">
          <div className="social_icons">
            <a
              href="https://github.com/yousefalsayed"
              target="_blank"
              rel="noreferrer"
              aria-label="GitHub"
            >
              <GithubIcon size={28} />
            </a>
            <a
              href="https://www.linkedin.com/in/yousef-alsayed-abdelfattah"
              target="_blank"
              rel="noreferrer"
              aria-label="LinkedIn"
            >
              <LinkedinIcon size={28} />
            </a>
          </div>
          <h1>Yousef Alsayed</h1>
          <p>AI Software Engineer & Mechatronics Graduate</p>

          <div className="mobile_social_icons">
            <a
              href="https://github.com/yousefalsayed"
              target="_blank"
              rel="noreferrer"
              aria-label="GitHub"
            >
              <GithubIcon size={28} />
            </a>
            <a
              href="https://www.linkedin.com/in/yousef-alsayed-abdelfattah"
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
