import { memo, type ReactNode } from 'react';

const headingTags = ['h2', 'h3', 'h4'] as const;

function safeLink(value: string): string | undefined {
  const href = value.trim();
  if (!href) return undefined;
  try {
    const url = new URL(href, 'https://yousefalsayed.me');
    if (['http:', 'https:', 'mailto:'].includes(url.protocol) && !url.username && !url.password) return href;
  } catch {
    return undefined;
  }
  return undefined;
}

function parseInlineMarkdown(text: string): ReactNode[] {
  const parts: ReactNode[] = [];
  const regex = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index));
    const token = match[0];
    const key = match.index;

    if (token.startsWith('**')) {
      parts.push(<strong key={key}>{token.slice(2, -2)}</strong>);
    } else if (token.startsWith('*')) {
      parts.push(<em key={key}>{token.slice(1, -1)}</em>);
    } else if (token.startsWith('`')) {
      parts.push(<code key={key}>{token.slice(1, -1)}</code>);
    } else {
      const link = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(token);
      const href = link && safeLink(link[2]);
      parts.push(link && href ? (
        <a key={key} href={href} target="_blank" rel="noopener noreferrer">
          {link[1]}
        </a>
      ) : token);
    }
    lastIndex = match.index + token.length;
  }

  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts;
}

export const MarkdownMessage = memo(function MarkdownMessage({ content }: { content: string }) {
  const elements: ReactNode[] = [];
  let currentList: { type: 'ul' | 'ol'; items: ReactNode[] } | null = null;
  let inCodeBlock = false;
  let codeBlockLines: string[] = [];

  const flushList = () => {
    if (!currentList) return;
    const ListTag = currentList.type;
    elements.push(
      <ListTag key={`list-${elements.length}`}>
        {currentList.items.map((item, index) => (
          <li key={index}>{item}</li>
        ))}
      </ListTag>
    );
    currentList = null;
  };
  const flushCodeBlock = () => {
    elements.push(
      <pre key={`code-${elements.length}`}>
        <code>{codeBlockLines.join('\n')}</code>
      </pre>
    );
    codeBlockLines = [];
  };

  for (const [index, rawLine] of content.split(/\r?\n/).entries()) {
    const trimmed = rawLine.trim();
    if (trimmed.startsWith('```')) {
      flushList();
      if (inCodeBlock) flushCodeBlock();
      inCodeBlock = !inCodeBlock;
      continue;
    }
    if (inCodeBlock) {
      codeBlockLines.push(rawLine);
      continue;
    }
    if (!trimmed) {
      flushList();
      continue;
    }

    const heading = /^(#{1,3}) (.+)$/.exec(trimmed);
    if (heading) {
      flushList();
      const HeadingTag = headingTags[heading[1].length - 1];
      elements.push(<HeadingTag key={`heading-${index}`}>{parseInlineMarkdown(heading[2])}</HeadingTag>);
      continue;
    }

    const list = /^(?:([*-])|\d+\.)\s+(.+)$/.exec(trimmed);
    if (list) {
      const type = list[1] ? 'ul' : 'ol';
      if (!currentList || currentList.type !== type) {
        flushList();
        currentList = { type, items: [] };
      }
      currentList.items.push(parseInlineMarkdown(list[2]));
      continue;
    }

    flushList();
    elements.push(<p key={`p-${index}`}>{parseInlineMarkdown(trimmed)}</p>);
  }

  flushList();
  if (inCodeBlock && codeBlockLines.length > 0) flushCodeBlock();
  return <div className="twin-markdown-body">{elements}</div>;
});
