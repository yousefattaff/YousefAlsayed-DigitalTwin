'use client';

import React, { useState } from 'react';

interface ProjectItem {
  title: string;
  description: string;
  mock: string;
  image?: string;
  video?: string;
  url?: string;
}

const projectList: ProjectItem[] = [
  {
    title: 'AI Digital Twin Platform',
    description:
      'A real-time conversational AI clone powered by FastAPI, OpenAI/Groq LLMs, and AWS Lambda. Visitors can chat directly with an AI that faithfully represents my career, skills, and technical expertise.',
    mock: '/images/mock10.png',
    image: '/projects/digital-twin.png',
    video: '/projects/digital-twin.mp4',
    url: '#twin',
  },
  {
    title: 'Automated AI Evaluation Pipeline',
    description:
      'RLHF benchmarking suite for evaluating LLM reasoning, mathematical accuracy, and instruction following. Built to systematically evaluate and refine frontier model performance.',
    mock: '/images/mock04.png',
    image: '/projects/ai-evaluation.png',
    video: '/projects/ai-evaluation.mp4',
    url: 'https://github.com/yousefalsayed',
  },
  {
    title: 'Industrial Automation & PLC Controller',
    description:
      'Control systems architecture designed for Siemens S7-1200/1500 PLCs and CNC machines. Automated manufacturing processes with TIA Portal programming and real-time sensor monitoring.',
    mock: '/images/mock06.png',
    image: '/projects/plc-automation.png',
    video: '/projects/plc-automation.mp4',
    url: 'https://github.com/yousefalsayed',
  },
  {
    title: 'Serverless Cloud Architecture',
    description:
      'Designed and deployed a full serverless stack on AWS — Lambda functions, API Gateway, S3, CloudFront CDN, and Terraform IaC — powering cost-efficient, scalable production services.',
    mock: '/images/mock05.png',
    image: '/projects/cloud-architecture.png',
    video: '/projects/cloud-architecture.mp4',
    url: 'https://github.com/yousefalsayed',
  },
  {
    title: 'Filmate AI: Semantic Search & Recommendations',
    description:
      'Intelligent media discovery platform featuring semantic vector embeddings with Qdrant, sentiment analysis, and natural language query understanding.',
    mock: '/images/mock07.png',
    url: 'https://github.com/yousefalsayed',
  },
  {
    title: 'Autonomous Robotics Navigation System',
    description:
      'Embedded robotics control system combining path-planning algorithms, sensor fusion, and real-time motor actuation developed during mechatronics research.',
    mock: '/images/mock08.png',
    url: 'https://github.com/yousefalsayed',
  },
];

function ProjectThumbnail({ project }: { project: ProjectItem }) {
  const [useFallback, setUseFallback] = useState(false);

  // If a video exists, render video with hover playback
  if (project.video) {
    return (
      <div className="project-media-wrapper">
        <video
          src={project.video}
          poster={project.image || project.mock}
          className="zoom"
          muted
          loop
          playsInline
          onMouseEnter={(e) => (e.target as HTMLVideoElement).play().catch(() => {})}
          onMouseLeave={(e) => {
            const v = e.target as HTMLVideoElement;
            v.pause();
            v.currentTime = 0;
          }}
          onError={() => setUseFallback(true)}
        />
      </div>
    );
  }

  // If custom screenshot image exists, try loading it; fall back to mock image if not present yet
  if (project.image && !useFallback) {
    return (
      <img
        src={project.image}
        className="zoom"
        alt={project.title}
        width="100%"
        onError={() => setUseFallback(true)}
      />
    );
  }

  // Default to template's authentic mock image
  return (
    <img
      src={project.mock}
      className="zoom"
      alt={project.title}
      width="100%"
    />
  );
}

export default function Projects() {
  return (
    <div className="projects-container" id="projects">
      <h1>Personal Projects</h1>
      <div className="projects-grid">
        {projectList.map((project) => (
          <div key={project.title} className="project">
            <a
              href={project.url || '#projects'}
              target={project.url?.startsWith('#') ? undefined : '_blank'}
              rel="noreferrer"
            >
              <ProjectThumbnail project={project} />
            </a>
            <a
              href={project.url || '#projects'}
              target={project.url?.startsWith('#') ? undefined : '_blank'}
              rel="noreferrer"
            >
              <h2>{project.title}</h2>
            </a>
            <p>{project.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
