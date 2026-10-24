'use client';

import { type FormEvent, useState } from 'react';

type TerminalLine = {
  command?: string;
  output?: string[];
};

const skills = [
  'AI solution development / AI-assisted coding / Claude Code',
  'Python',
  'OpenAI Agents SDK / CrewAI / LangGraph / n8n',
  'MCP / FastMCP',
  'LangChain / ChromaDB / RAG',
  'PyTorch / Qwen / QLoRA experiments',
  'Prompt Engineering / LLM Evaluation / RLHF',
  'FastAPI',
  'Pydantic / Langfuse',
  'OpenAI / Groq LLMs',
  'Docker',
  'AWS SAM / DynamoDB Streams / Pytest',
  'AWS Lambda / S3 / API Gateway / CloudFront',
  'Git',
  'Next.js / React',
  'Embedded C / ROS / Mechatronics / Control Systems',
];

const projects = [
  'Advanced Engineering Team',
  'SDR Multi-Agent',
  'EgyptianSavoryScout',
  'R2-WAITER',
  'RAG-AI-Agent',
  'ATmega32 Drivers and Applications',
];

const initialLines: TerminalLine[] = [
  {
    output: [
      'Welcome to Yousef’s developer terminal.',
      'Type “help” to see available commands.',
    ],
  },
];

function getOutput(command: string): string[] {
  switch (command) {
    case 'help':
      return [
        'Available commands:',
        '  help      Show this command list',
        '  whoami    Show verified profile details',
        '  skills    List current technologies',
        '  projects  List selected projects',
        '  contact   Show contact links',
        '  clear     Clear the terminal',
      ];
    case 'whoami':
      return [
        'Yousef Alsayed Abdelfattah',
        'AI Engineer | AI Solutions, LLMs & Multi-Agent Systems',
        'Cairo, Egypt',
        'AI Intern @ Arche Robotics / Programming Instructor @ iSchool',
      ];
    case 'skills':
      return skills.map((skill) => `• ${skill}`);
    case 'projects':
      return projects.map((project, index) => `${index + 1}. ${project}`);
    case 'contact':
      return [
        'Email: yousefabuelkhear@gmail.com',
        'GitHub: github.com/yousefattaff',
        'LinkedIn: linkedin.com/in/yousef-alsayed-abdelfattah',
      ];
    default:
      return [`Command not found: ${command}. Type “help” for available commands.`];
  }
}

export default function DeveloperTerminal() {
  const [history, setHistory] = useState<TerminalLine[]>(initialLines);
  const [input, setInput] = useState('');

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const command = input.trim().toLowerCase();
    if (!command) return;

    if (command === 'clear') {
      setHistory([]);
      setInput('');
      return;
    }

    setHistory((current) => [...current, { command, output: getOutput(command) }]);
    setInput('');
  }

  return (
    <section
      id="terminal"
      className="developer-terminal"
      aria-labelledby="terminal-title"
    >
      <div className="terminal-window">
        <div className="terminal-window-bar">
          <span aria-hidden="true" className="terminal-window-dot terminal-window-dot-muted" />
          <span aria-hidden="true" className="terminal-window-dot terminal-window-dot-mid" />
          <span aria-hidden="true" className="terminal-window-dot terminal-window-dot-bright" />
          <h2 id="terminal-title" className="terminal-window-title">
            developer-terminal
          </h2>
        </div>

        <div
          role="log"
          aria-live="polite"
          className="terminal-console"
        >
          {history.map((line, index) => (
            <div key={`${line.command ?? 'welcome'}-${index}`} className="terminal-entry">
              {line.command && (
                <div>
                  <span className="terminal-prompt">guest@yousef:~$</span>{' '}
                  <span>{line.command}</span>
                </div>
              )}
              {line.output?.map((entry) => (
                <div key={entry} className="terminal-output">
                  {entry}
                </div>
              ))}
            </div>
          ))}
          <form onSubmit={handleSubmit} className="terminal-command-form">
            <label htmlFor="developer-terminal-input" className="terminal-prompt">
              guest@yousef:~$
            </label>
            <input
              id="developer-terminal-input"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              aria-label="Terminal command"
              autoComplete="off"
              spellCheck={false}
              className="terminal-command-input"
            />
          </form>
        </div>
      </div>
    </section>
  );
}
