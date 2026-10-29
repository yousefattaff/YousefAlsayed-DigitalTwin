import Navbar from '@/components/Navbar';
import Hero from '@/components/Hero';
import Expertise from '@/components/Expertise';
import Timeline, { type Milestone } from '@/components/Timeline';
import Projects, { type ProjectShowcaseItem } from '@/components/Projects';
import ChatWidget from '@/components/ChatWidget';
import Footer from '@/components/Footer';
import AchievementsSection, { type GraduationAchievement } from '@/components/AchievementsSection';
import ResumeSection from '@/components/ResumeSection';
import type { CertificateMedia } from '@/lib/content';

export interface HomeProfile {
  displayName: string;
  headline: string;
  avatarUrl: string;
  githubUrl: string;
  linkedinUrl: string;
}

export type HomeMilestone = Milestone;

export default function HomeClient({
  profile,
  milestones,
  projects,
  graduationProject,
  resumeUrl,
  driveUrl,
  certificateMedia,
}: {
  profile: HomeProfile;
  milestones: HomeMilestone[];
  projects: ProjectShowcaseItem[];
  graduationProject: GraduationAchievement;
  resumeUrl: string;
  driveUrl: string;
  certificateMedia: CertificateMedia[];
}) {
  return (
    <div className="main-container primary-mode">
      <Navbar />
      <main>
        <Hero profile={profile} />
        <Expertise />
        <Timeline milestones={milestones} />
        <Projects projects={projects} />
        <AchievementsSection graduationProject={graduationProject} certificateMedia={certificateMedia} />
        <ResumeSection resumeUrl={resumeUrl} driveUrl={driveUrl} />
        <ChatWidget />
      </main>
      <Footer />
    </div>
  );
}
