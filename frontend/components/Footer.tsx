import { GithubIcon, LinkedinIcon } from './Icons';

export default function Footer() {
  return (
    <footer id="contact">
      <div>
        <a
          href="https://github.com/yousefattaff"
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
        <a href="mailto:yousefabuelkhear@gmail.com">Email Yousef</a>
        {' · '}
        <a href="/resume.pdf" download>Download resume</a>
      </p>
      <p>
        A portfolio designed &amp; built by{' '}
        <a
          href="https://www.linkedin.com/in/yousef-alsayed-abdelfattah"
          target="_blank"
          rel="noreferrer"
        >
          Yousef Alsayed
        </a>{' '}
        with 💜
      </p>
    </footer>
  );
}
