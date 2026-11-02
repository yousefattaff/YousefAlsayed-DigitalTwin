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
        <p className="content-lede">View the PDF here, or download the PDF or the Word file. The Word file is the one to upload to an application form.</p>
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
        <a href="/Yousef-Alsayed-Resume.docx" download>Download Word file</a>
        {driveUrl && <a href={driveUrl} target="_blank" rel="noreferrer">Open in Google Drive</a>}
      </p>
    </section>
  );
}
