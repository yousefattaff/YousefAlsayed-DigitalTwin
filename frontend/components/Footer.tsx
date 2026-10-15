'use client';

import React from 'react';
import { GithubIcon, LinkedinIcon } from './Icons';

export default function Footer() {
  return (
    <footer>
      <div>
        <a
          href="https://github.com/yousefalsayed"
          target="_blank"
          rel="noreferrer"
          aria-label="GitHub"
        >
          <GithubIcon size={24} />
        </a>
        <a
          href="https://www.linkedin.com/in/yousef-alsayed-abdelfattah"
          target="_blank"
          rel="noreferrer"
          aria-label="LinkedIn"
        >
          <LinkedinIcon size={24} />
        </a>
      </div>
      <p>
        A portfolio designed &amp; built by{' '}
        <a
          href="https://www.linkedin.com/in/yousef-alsayed-abdelfattah"
          target="_blank"
          rel="noreferrer"
        >
          Yousef Alsayed Abdelfattah
        </a>{' '}
        with 💜
      </p>
    </footer>
  );
}
