const labelsFirst = [
  'Claude Code',
  'AI-Assisted Coding',
  'OpenAI Agents SDK',
  'CrewAI',
  'LangGraph',
  'n8n',
  'MCP',
  'Prompt Engineering',
];

const labelsSecond = [
  'Python',
  'LangChain',
  'ChromaDB',
  'RAG',
  'PyTorch',
  'Qwen / QLoRA',
  'Pydantic',
  'Langfuse',
  'LLM Evaluation / RLHF',
];

const labelsThird = [
  'FastAPI',
  'Docker',
  'AWS Lambda / SAM',
  'DynamoDB Streams',
  'Groq',
  'FastMCP',
  'Pytest',
  'Next.js / React',
];

const ReactIconSvg = () => (
  <svg width="48" height="48" viewBox="0 0 115.3 100" fill="currentColor">
    <path d="M57.6,65.8 C62.3,65.8 66.1,62 66.1,57.3 C66.1,52.6 62.3,48.8 57.6,48.8 C52.9,48.8 49.1,52.6 49.1,57.3 C49.1,62 52.9,65.8 57.6,65.8 Z" />
    <path d="M110.8,45.4 C107.5,33.5 98.4,24.1 86.3,20 C76.7,16.7 66.4,17.4 56.7,21.5 C49.2,14.6 40.5,10.6 31.9,10.6 C20.9,10.6 11,16.9 6.2,26.8 C1.5,36.5 2.6,48.3 8.9,57.8 C3.1,65.6 0.9,75.4 3.1,84.9 C5.9,97 15,106.3 27,110.3 C36.6,113.6 46.9,112.9 56.6,108.8 C64.1,115.7 72.8,119.7 81.4,119.7 C92.4,119.7 102.3,113.4 107.1,103.5 C111.8,93.8 110.7,82 104.4,72.5 C110.2,64.7 112.4,54.9 110.8,45.4 Z" fill="none" stroke="currentColor" strokeWidth="4" />
  </svg>
);

const DockerIconSvg = () => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
    <path d="M13.983 11.078h2.119a.186.186 0 00.186-.185V9.006a.186.186 0 00-.186-.186h-2.119a.185.185 0 00-.185.185v1.888c0 .102.083.185.185.185m-2.954-5.43h2.118a.186.186 0 00.186-.186V3.574a.186.186 0 00-.186-.185h-2.118a.185.185 0 00-.185.185v1.888c0 .102.082.186.185.186zm0 2.716h2.118a.187.187 0 00.186-.186V6.29a.186.186 0 00-.186-.185h-2.118a.185.185 0 00-.185.185v1.887c0 .102.082.186.185.186zm-2.93 0h2.12a.186.186 0 00.184-.186V6.29a.185.185 0 00-.185-.185H8.1a.185.185 0 00-.185.185v1.887c0 .102.083.186.185.186zm-2.964 0h2.119a.186.186 0 00.185-.186V6.29a.185.185 0 00-.185-.185H5.136a.186.186 0 00-.186.185v1.887c0 .102.084.186.186.186zm5.893 2.715h2.119a.186.186 0 00.186-.185V9.006a.186.186 0 00-.186-.186h-2.119a.185.185 0 00-.185.185v1.888c0 .102.082.185.185.185zm-2.93 0h2.12a.185.185 0 00.184-.185V9.006a.185.185 0 00-.184-.186h-2.12a.185.185 0 00-.184.185v1.888c0 .102.083.185.185.185zm-2.964 0h2.119a.185.185 0 00.185-.185V9.006a.185.185 0 00-.185-.186H5.136a.186.186 0 00-.186.185v1.888c0 .102.084.185.186.185zm-2.928 0h2.119a.185.185 0 00.185-.185V9.006a.185.185 0 00-.185-.186H2.208a.186.186 0 00-.186.185v1.888c0 .102.084.185.186.185zM23.957 11.83c-.49-.785-1.572-1.096-2.613-.746a5.57 5.57 0 00-.54-.925c-.234-.3-.509-.567-.822-.796a5.2 5.2 0 00-1.077-.557c-.434-.15-.898-.224-1.378-.22-.167.001-.334.01-.5.027V7.07a.64.64 0 00-.64-.64H1.47a.64.64 0 00-.64.64v8.283c0 3.037 2.052 5.64 5.093 6.463 3.653.987 7.747.784 11.238-.557 2.684-1.03 4.887-3.21 5.922-5.836.297-.753.518-1.54.654-2.348.423-.396.697-.93.697-1.53a2.3 2.3 0 00-.477-1.355z" />
  </svg>
);

const PythonIconSvg = () => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
    <path d="M11.914 0C5.82 0 6.2 2.656 6.2 2.656l.006 2.75h5.808v.826H3.85S0 5.78 0 11.9c0 6.12 3.36 5.904 3.36 5.904h2.004v-2.82s-.108-3.36 3.298-3.36h5.65v-.868s.07-2.656-2.398-2.656zm-1.636 1.706a1.004 1.004 0 110 2.008 1.004 1.004 0 010-2.008zM12.086 24c6.094 0 5.714-2.656 5.714-2.656l-.006-2.75h-5.808v-.826h8.164S24 18.22 24 12.1c0-6.12-3.36-5.904-3.36-5.904h-2.004v2.82s.108 3.36-3.298 3.36h-5.65v.868s-.07 2.656 2.398 2.656zm1.636-1.706a1.004 1.004 0 110-2.008 1.004 1.004 0 010-2.008z" />
  </svg>
);

export default function Expertise() {
  return (
    <div className="container" id="expertise">
      <div className="skills-container" id="skills">
        <h1>Expertise</h1>
        <div className="skills-grid">
          {/* Pillar 1 */}
          <div className="skill">
            <ReactIconSvg />
            <h3>AI Solutions &amp; Automation</h3>
            <p>
              I use AI-assisted development to build practical LLM applications, multi-agent systems, and workflow automations, connecting agents to tools and checking the results.
            </p>
            <div className="flex-chips">
              <span className="chip-title">Tech stack:</span>
              {labelsFirst.map((label) => (
                <span key={label} className="chip">
                  <span>{label}</span>
                </span>
              ))}
            </div>
          </div>

          {/* Pillar 2 */}
          <div className="skill">
            <DockerIconSvg />
            <h3>RAG, Fine-Tuning &amp; Evaluation</h3>
            <p>
              I build document retrieval pipelines and experiment with Qwen and QLoRA, using structured outputs, tracing, and LLM evaluation to improve reliability.
            </p>
            <div className="flex-chips">
              <span className="chip-title">Tech stack:</span>
              {labelsSecond.map((label) => (
                <span key={label} className="chip">
                  <span>{label}</span>
                </span>
              ))}
            </div>
          </div>

          {/* Pillar 3 */}
          <div className="skill">
            <PythonIconSvg />
            <h3>Production AI &amp; Cloud Engineering</h3>
            <p>
              I connect AI systems to Python APIs, Docker, and AWS, including real-time robot telemetry, DynamoDB Streams, MCP tooling, and automated testing.
            </p>
            <div className="flex-chips">
              <span className="chip-title">Tech stack:</span>
              {labelsThird.map((label) => (
                <span key={label} className="chip">
                  <span>{label}</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
