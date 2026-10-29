import HomeClient, {
  type HomeMilestone,
  type HomeProfile,
} from '@/components/HomeClient';
import { getProfile, getProjects, getAchievements, getCertificateMedia, getResume } from '@/lib/content';
import type { GraduationAchievement } from '@/components/AchievementsSection';

function stringValue(value: unknown, fallback = '') {
  return typeof value === 'string' && value ? value : fallback;
}

function objectValue(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

export default function Home() {
  const profileDocument = getProfile();
  const profile = profileDocument.data;
  const achievementData = getAchievements().data;
  const resumeData = getResume(profileDocument).data;
  const profileLinks = objectValue(profile.links);
  const milestones: HomeMilestone[] = Array.isArray(achievementData.career_history)
    ? achievementData.career_history.map((value: unknown) => {
      const item = objectValue(value);
      return {
        date: stringValue(item.date),
        title: stringValue(item.title),
        subtitle: stringValue(item.subtitle),
        description: stringValue(item.description),
        isEducation: item.isEducation === true,
      };
    })
    : [];
  const projects = getProjects().map((project) => {
    const media = objectValue(project.data.media);
    const links = objectValue(project.data.links);
    return {
      title: stringValue(project.data.title, project.slug),
      description: stringValue(project.data.summary, project.body.split(/\n\n/, 1)[0]),
      mock: stringValue(media.mock, '/projects/project-placeholder.png'),
      image: stringValue(media.image) || undefined,
      video: stringValue(media.video) || undefined,
      url: stringValue(links.repository, '#projects'),
    };
  });
  const graduationProject = objectValue(achievementData.graduation_project);
  const graduationAchievement: GraduationAchievement = {
    title: stringValue(graduationProject.title, 'Graduation project'),
    status: stringValue(graduationProject.status, 'To be added'),
    description: stringValue(graduationProject.description),
    award: stringValue(graduationProject.award, 'Award name will be added here.'),
    details: Array.isArray(graduationProject.details)
      ? graduationProject.details.map(String)
      : [],
    video: stringValue(graduationProject.video),
    model: stringValue(graduationProject.model),
    photos: Array.isArray(graduationProject.photos)
      ? graduationProject.photos.map(String).filter(Boolean)
      : [stringValue(graduationProject.photo)].filter(Boolean),
    galleryVideos: Array.isArray(graduationProject.gallery_videos)
      ? graduationProject.gallery_videos.map((value: unknown) => {
        const item = objectValue(value);
        return {
          src: stringValue(item.src),
          poster: stringValue(item.poster),
          title: stringValue(item.title, 'Graduation project video'),
        };
      }).filter((video) => Boolean(video.src && video.poster))
      : [],
  };
  const homeProfile: HomeProfile = {
    displayName: stringValue(profile.display_name, stringValue(profile.name, 'Yousef Alsayed')),
    headline: stringValue(profile.headline),
    avatarUrl: stringValue(profile.avatar_url, '/data/profile/yousef.jpg'),
    githubUrl: stringValue(profileLinks.github),
    linkedinUrl: stringValue(profileLinks.linkedin),
  };

  return (
    <HomeClient
      profile={homeProfile}
      milestones={milestones}
      projects={projects}
      graduationProject={graduationAchievement}
      resumeUrl={stringValue(resumeData.resume_url, '/resume.pdf')}
      driveUrl={stringValue(resumeData.resume_drive_url)}
      certificateMedia={getCertificateMedia()}
    />
  );
}
