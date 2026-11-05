# Content schema

This directory is the canonical Markdown knowledge source for the portfolio and Digital Twin. Use stable kebab-case filenames, YAML frontmatter, and plain prose. Keep claims traceable to the supplied resume, LinkedIn export, certificates, or project records.

## Layout

```text
content/
├── README.md                  Schema and editing guide
├── profile.md                 Public identity, links, avatar, and resume URL
├── digital-twin.md            Owner-approved bilingual profile and concise answers
├── about.md                   Introduction
├── resume.md                  Education and resume metadata
├── experience.md              Detailed employment and training history
├── expertise.md               AI solutions, development, and robotics skills
├── achievements.md            Career milestones and recognition
├── projects/                  Seven project narratives and presentation metadata
└── certifications/            Course and exam records with verified metadata
```

## Frontmatter and provenance

Content entries use `title`, `slug`, `type`, and `order`.

- Projects include `summary`, `status`, `role`, `technologies`, `featured`, and optional `links`. Project presentation metadata belongs in each project's `media` field.
- Certifications include `issuer`, `issued`, `credential`, optional `credential_url`, and `topics` when the source supplies them.
- Profile metadata uses scalar values and arrays for identity, location, links, and skills. Update shared identity and public links in `profile.md`.
- `digital-twin.md` follows the owner's November 4, 2026 professional profile. Keep its `# Topic (en)` and `# Topic (ar)` headings for Profile, Projects, Skills, Career, Education, Certifications and Contact. Each section must fit a 900-character evidence quote; combined profile/project and contact answers must fit 1,600 characters.
- `experience.md` and the persona files in `backend/data/` incorporate the LinkedIn export at `backend/data/linkedin.pdf`.
- Keep the localized `# Arche Robotics tools (en/ar)` sections in `experience.md` and `# Graduation answer (en/ar)` sections in `achievements.md`. These authored answers let recognized factual questions recover safely from a rejected model draft; each full section must fit a 900-character quote.
- `expertise.md` describes AI solution development, AI-assisted coding, agents, RAG, backend engineering, fine-tuning experiments, and robotics.
- Certificate knowledge is checked against the supplied files in `frontend/public/certificates/`. The current achievements UI discovers these media files as one scrollable gallery.

## Supplemental conversation knowledge

Twenty additional root-level notes provide short English and Egyptian Arabic answers. Their `sources` frontmatter records the existing portfolio documents, public resume, or LinkedIn export supporting the text.

| Topic | Notes |
| --- | --- |
| Background and personality | `biography.md`, `current-focus.md`, `professional-fun-facts.md` |
| Career | `career-timeline.md`, `arche-robotics-monitoring.md`, `arche-robotics-reliability.md`, `ischool-teaching.md`, `outlier-llm-evaluation.md`, `military-service.md` |
| Education and communication | `education-and-training.md`, `english-and-communication.md`, `certifications-and-learning.md` |
| Technical practice | `programming-languages.md`, `ai-agents-and-automation.md`, `rag-and-search.md`, `fine-tuning-and-local-models.md`, `cloud-and-backend.md`, `robotics-and-embedded.md`, `engineering-approach.md` |
| Recruiting | `collaboration-and-availability.md` |

For these root-level notes, use `type: about`, `profile`, `resume`, `experience`, `expertise`, or `achievements`. The native Twin uses those types to include additional files in existing topic searches. Project and certification folders retain their own categories. Keep detailed named-project answers in the existing project file because named-project searches select that file.

Keep each answer paragraph below 900 characters. The native loader supports at most 64 knowledge documents, and `JSON.stringify(facts)` must remain below 7,000 characters. Put detailed narratives in Markdown and concise structured facts in `backend/data/facts.json`; the per-question evidence budget remains five passages and 2,800 quote characters.

Make each answer self-contained, including the relevant employer or project name. In Arabic, separate prefixes from Latin technical identifiers with a space so quoted tool names remain recognizable. Specific searches skip files with no matching terms when relevant files exist. Topic-pattern hints select fallback wording; an answer citing supplied evidence still passes source, security, numeric, and factual checks even when a new topic is absent from the patterns.

The public resume supports CGPA 3.34, Arabic as a native language, English at professional proficiency, the R2-WAITER operator-interface contribution, and the RAG-AI-Agent four-of-24 retrieval detail. It does not specify a CGPA scale. Professional fun facts describe documented work and projects; personal hobbies, favorites, age, and anecdotes require facts supplied by the owner.

Use `YYYY-MM-DD` for known exact dates, otherwise a verified year or readable period. Omit unknown dates, issuers, outcomes, and tools. The owner's latest guide identifies the R2-WAITER graduation robot as ROS2 with Jetson Nano, LiDAR and RealSense; keep that physical robot distinct from the TurtleBot3/Gazebo repository simulation.

## Synchronization

From `frontend/`, run `npm run sync:content` after edits. The script copies canonical Markdown into `frontend/content/` and copies `facts.json`, `summary.txt`, and `style.txt` from `backend/data/` into `frontend/data/twin/`.

Development and production builds run that synchronization automatically. Include the synchronized copies in a release: Next.js traces them into the native chat and health functions. This guide is documentation; the Twin's retrieval excludes README files.

Preserve the public section IDs `about`, `skills`, `projects`, `achievements`, `terminal`, `contact`, and `twin` when changing presentation.
