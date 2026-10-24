export default function ResumeSection({
  resumeUrl,
  driveUrl,
}: {
  resumeUrl: string;
  driveUrl: string;
}) {
  return (
    <section id="resume" className="content-page home-content-section">
      <header className="content-header">
        <p className="eyebrow">Resume</p>
        <h1>Resume</h1>
        <p className="content-lede">View my resume PDF directly in this document window, or download a copy below.</p>
      </header>
      <div className="resume-viewer" aria-label="Resume PDF viewer">
        <div className="resume-viewer-bar">
          <span className="resume-viewer-dot resume-viewer-dot-red" />
          <span className="resume-viewer-dot resume-viewer-dot-yellow" />
          <span className="resume-viewer-dot resume-viewer-dot-green" />
          <span className="resume-viewer-title">yousef-alsayed-resume.pdf</span>
        </div>
        <iframe
          src={resumeUrl}
          title="Yousef Alsayed resume PDF"
          loading="lazy"
        />
      </div>
      <p className="resume-download">
        <a href={resumeUrl} download>Download resume PDF</a>
        {driveUrl && <a href={driveUrl} target="_blank" rel="noreferrer">Open in Google Drive</a>}
      </p>
    </section>
  );
}
