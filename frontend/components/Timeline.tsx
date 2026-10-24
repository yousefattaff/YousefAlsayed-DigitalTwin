export interface Milestone {
  date: string;
  title: string;
  subtitle: string;
  description: string;
  isEducation?: boolean;
}

const BriefcaseIconSvg = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
  </svg>
);

const GraduationIconSvg = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
    <path d="M6 12v5c3 3 9 3 12 0v-5" />
  </svg>
);

export default function Timeline({ milestones }: { milestones: Milestone[] }) {
  return (
    <div id="history">
      <div className="items-container">
        <h1>Career History</h1>
        <div className="vertical-timeline vertical-timeline--animate vertical-timeline--two-columns">
          {milestones.map((item) => (
            <div key={`${item.date}-${item.title}`} className="vertical-timeline-element vertical-timeline-element--work">
              <span className="vertical-timeline-element-icon">
                {item.isEducation ? <GraduationIconSvg /> : <BriefcaseIconSvg />}
              </span>
              <div className="vertical-timeline-element-content">
                <div className="vertical-timeline-element-content-arrow" />
                <h3 className="vertical-timeline-element-title">{item.title}</h3>
                <h4 className="vertical-timeline-element-subtitle">{item.subtitle}</h4>
                <p>{item.description}</p>
                <span className="vertical-timeline-element-date">{item.date}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
