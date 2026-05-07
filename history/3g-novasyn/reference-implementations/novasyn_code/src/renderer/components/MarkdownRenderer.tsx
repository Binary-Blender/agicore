import React, { useState, useCallback, useMemo } from 'react';
import { useCodeStore } from '../store/codeStore';

// ─── File Path Detection ────────────────────────────────────────────────────

const FILE_PATH_PATTERNS: Array<{ regex: RegExp; group: number }> = [
  // // src/components/Foo.tsx  or  // path/to/file.ext
  { regex: /^\/\/\s+([\w./-]+\.\w+)/, group: 1 },
  // # src/utils/helper.py  (Python / Shell)
  { regex: /^#\s+([\w./-]+\.\w+)/, group: 1 },
  // -- migrations/001.sql  (SQL)
  { regex: /^--\s+([\w./-]+\.\w+)/, group: 1 },
  // <!-- src/index.html -->  (HTML)
  { regex: /^<!--\s+([\w./-]+\.\w+)\s*-->/, group: 1 },
];

function extractFilePath(firstLine: string): string | null {
  const trimmed = firstLine.trim();
  for (const { regex, group } of FILE_PATH_PATTERNS) {
    const match = trimmed.match(regex);
    if (match && match[group].includes('/')) {
      return match[group];
    }
  }
  return null;
}

// ─── Basic Syntax Highlighting ──────────────────────────────────────────────

const KEYWORD_SET = new Set([
  'import', 'export', 'from', 'default', 'function', 'const', 'let', 'var',
  'return', 'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'break',
  'continue', 'new', 'this', 'class', 'extends', 'implements', 'interface',
  'type', 'enum', 'async', 'await', 'try', 'catch', 'finally', 'throw',
  'typeof', 'instanceof', 'in', 'of', 'true', 'false', 'null', 'undefined',
  'void', 'delete', 'yield', 'static', 'public', 'private', 'protected',
  'readonly', 'abstract', 'override', 'super', 'as', 'is', 'keyof',
  'def', 'elif', 'pass', 'raise', 'with', 'lambda', 'None', 'True', 'False',
  'self', 'cls', 'nonlocal', 'global', 'assert', 'except', 'print',
  'SELECT', 'FROM', 'WHERE', 'INSERT', 'UPDATE', 'DELETE', 'CREATE',
  'DROP', 'ALTER', 'JOIN', 'LEFT', 'RIGHT', 'INNER', 'OUTER', 'ON',
  'AND', 'OR', 'NOT', 'IN', 'EXISTS', 'GROUP', 'BY', 'ORDER', 'HAVING',
  'LIMIT', 'OFFSET', 'SET', 'VALUES', 'INTO', 'TABLE', 'INDEX',
]);

function highlightLine(line: string): React.ReactNode[] {
  const tokens: React.ReactNode[] = [];
  // Regex to tokenize: strings, comments, numbers, words, whitespace, operators
  const tokenRegex = /(\/\/.*$|#.*$|--.*$|\/\*[\s\S]*?\*\/|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`|\b\d+\.?\d*\b|[a-zA-Z_$][\w$]*|[ \t]+|.)/g;
  let match: RegExpExecArray | null;
  let idx = 0;

  while ((match = tokenRegex.exec(line)) !== null) {
    const token = match[0];
    const key = idx++;

    // Single-line comments
    if (/^(\/\/|#(?!!)|--)[^"'`]*$/.test(token) && !token.startsWith('#!')) {
      tokens.push(<span key={key} className="text-slate-500 italic">{token}</span>);
    }
    // Block comments
    else if (token.startsWith('/*')) {
      tokens.push(<span key={key} className="text-slate-500 italic">{token}</span>);
    }
    // Strings
    else if (/^["'`]/.test(token)) {
      tokens.push(<span key={key} className="text-emerald-400">{token}</span>);
    }
    // Numbers
    else if (/^\d/.test(token)) {
      tokens.push(<span key={key} className="text-amber-400">{token}</span>);
    }
    // Keywords
    else if (KEYWORD_SET.has(token)) {
      tokens.push(<span key={key} className="text-purple-400 font-semibold">{token}</span>);
    }
    // Identifiers and other tokens
    else {
      tokens.push(<span key={key}>{token}</span>);
    }
  }

  return tokens;
}

// ─── Code Block Component ───────────────────────────────────────────────────

interface CodeBlockProps {
  language: string;
  code: string;
}

function CodeBlock({ language, code }: CodeBlockProps) {
  const [copyLabel, setCopyLabel] = useState('Copy');
  const [applyLabel, setApplyLabel] = useState('Apply');

  const projects = useCodeStore((s) => s.projects);
  const currentProjectId = useCodeStore((s) => s.currentProjectId);
  const setSelectedFilePath = useCodeStore((s) => s.setSelectedFilePath);
  const setCurrentView = useCodeStore((s) => s.setCurrentView);

  const currentProject = projects.find((p) => p.id === currentProjectId);

  // Extract file path from the first line of code
  const lines = code.split('\n');
  const detectedPath = useMemo(() => extractFilePath(lines[0] || ''), [lines[0]]);

  // The actual code content (without the file-path comment line when applying)
  const codeForDisplay = code;
  const codeForApply = detectedPath ? lines.slice(1).join('\n').replace(/^\n/, '') : code;

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopyLabel('Copied!');
      setTimeout(() => setCopyLabel('Copy'), 1500);
    } catch {
      setCopyLabel('Failed');
      setTimeout(() => setCopyLabel('Copy'), 1500);
    }
  }, [code]);

  const handleApply = useCallback(async () => {
    if (!detectedPath || !currentProject) return;
    try {
      const fullPath = currentProject.path.replace(/\/$/, '') + '/' + detectedPath.replace(/^\//, '');
      await window.electronAPI.writeFile(fullPath, codeForApply);
      setApplyLabel('Applied!');
      setTimeout(() => setApplyLabel('Apply'), 2000);
    } catch {
      setApplyLabel('Error');
      setTimeout(() => setApplyLabel('Apply'), 2000);
    }
  }, [detectedPath, currentProject, codeForApply]);

  const handleCreate = useCallback(() => {
    // Open the editor view so the user can create a new file with this code
    setSelectedFilePath(null);
    setCurrentView('editor');
  }, [setSelectedFilePath, setCurrentView]);

  const highlightedLines = useMemo(
    () => codeForDisplay.split('\n').map((line, i) => (
      <div key={i} className="leading-relaxed">
        <span className="inline-block w-10 text-right pr-3 text-slate-600 select-none text-[11px]">
          {i + 1}
        </span>
        {highlightLine(line)}
      </div>
    )),
    [codeForDisplay],
  );

  return (
    <div className="my-3 rounded-lg overflow-hidden border border-slate-700/50">
      {/* Header bar */}
      <div className="flex items-center justify-between bg-slate-800 px-3 py-1.5 border-b border-slate-700/50">
        <div className="flex items-center gap-2 min-w-0">
          {language && (
            <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wide shrink-0">
              {language}
            </span>
          )}
          {detectedPath && (
            <span className="text-[11px] font-mono text-blue-400 truncate" title={detectedPath}>
              {detectedPath}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0 ml-2">
          <button
            onClick={handleCopy}
            className="px-2 py-0.5 text-[11px] text-slate-400 hover:text-blue-400 rounded transition-colors"
          >
            {copyLabel}
          </button>
          {detectedPath && currentProject ? (
            <button
              onClick={handleApply}
              className="px-2 py-0.5 text-[11px] text-slate-400 hover:text-blue-400 rounded transition-colors"
            >
              {applyLabel}
            </button>
          ) : (
            <button
              onClick={handleCreate}
              className="px-2 py-0.5 text-[11px] text-slate-400 hover:text-blue-400 rounded transition-colors"
            >
              Create
            </button>
          )}
        </div>
      </div>

      {/* Code content */}
      <div className="bg-slate-900 px-3 py-3 overflow-x-auto">
        <pre className="text-[13px] font-mono text-slate-300 leading-relaxed whitespace-pre">
          {highlightedLines}
        </pre>
      </div>
    </div>
  );
}

// ─── Inline Markdown Parsing ────────────────────────────────────────────────

/**
 * Parse inline markdown (bold, italic, inline code, links) within a text
 * segment and return React nodes.
 */
function parseInline(text: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  // Combined regex for inline elements:
  //   `code`  |  **bold**  |  *italic*  |  _italic_  |  [text](url)
  const inlineRegex = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*|_[^_]+_|\[([^\]]+)\]\(([^)]+)\))/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = inlineRegex.exec(text)) !== null) {
    // Push preceding plain text
    if (match.index > lastIndex) {
      nodes.push(<span key={key++}>{text.slice(lastIndex, match.index)}</span>);
    }

    const token = match[0];

    if (token.startsWith('`')) {
      // Inline code
      nodes.push(
        <code
          key={key++}
          className="bg-slate-700 text-pink-400 rounded px-1 py-0.5 text-[13px] font-mono"
        >
          {token.slice(1, -1)}
        </code>,
      );
    } else if (token.startsWith('**')) {
      // Bold
      nodes.push(
        <strong key={key++} className="text-slate-200 font-semibold">
          {token.slice(2, -2)}
        </strong>,
      );
    } else if (token.startsWith('[')) {
      // Link
      const linkText = match[2];
      const url = match[3];
      nodes.push(
        <a
          key={key++}
          href={url}
          className="text-blue-400 hover:underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          {linkText}
        </a>,
      );
    } else if (token.startsWith('*') || token.startsWith('_')) {
      // Italic
      nodes.push(
        <em key={key++} className="text-slate-300 italic">
          {token.slice(1, -1)}
        </em>,
      );
    }

    lastIndex = match.index + token.length;
  }

  // Remaining plain text
  if (lastIndex < text.length) {
    nodes.push(<span key={key++}>{text.slice(lastIndex)}</span>);
  }

  return nodes;
}

// ─── Block-Level Markdown Parser ────────────────────────────────────────────

interface ParsedBlock {
  type: 'heading' | 'paragraph' | 'code' | 'ul' | 'ol' | 'hr' | 'blank';
  level?: number;       // heading level (1-4) or list nesting
  language?: string;     // code block language
  content: string;
  items?: string[];      // list items
}

function parseBlocks(markdown: string): ParsedBlock[] {
  const lines = markdown.split('\n');
  const blocks: ParsedBlock[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Fenced code block
    const codeMatch = line.match(/^```(\w*)/);
    if (codeMatch) {
      const language = codeMatch[1] || '';
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].match(/^```\s*$/)) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing ```
      blocks.push({ type: 'code', language, content: codeLines.join('\n') });
      continue;
    }

    // Horizontal rule
    if (/^(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
      blocks.push({ type: 'hr', content: '' });
      i++;
      continue;
    }

    // Headings
    const headingMatch = line.match(/^(#{1,4})\s+(.+)/);
    if (headingMatch) {
      blocks.push({
        type: 'heading',
        level: headingMatch[1].length,
        content: headingMatch[2],
      });
      i++;
      continue;
    }

    // Unordered list
    if (/^[\s]*[-*+]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[\s]*[-*+]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^[\s]*[-*+]\s+/, ''));
        i++;
      }
      blocks.push({ type: 'ul', content: '', items });
      continue;
    }

    // Ordered list
    if (/^[\s]*\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[\s]*\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^[\s]*\d+\.\s+/, ''));
        i++;
      }
      blocks.push({ type: 'ol', content: '', items });
      continue;
    }

    // Blank line
    if (line.trim() === '') {
      blocks.push({ type: 'blank', content: '' });
      i++;
      continue;
    }

    // Paragraph — accumulate contiguous non-blank, non-special lines
    const paraLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !lines[i].match(/^```/) &&
      !lines[i].match(/^#{1,4}\s+/) &&
      !lines[i].match(/^(-{3,}|\*{3,}|_{3,})\s*$/) &&
      !lines[i].match(/^[\s]*[-*+]\s+/) &&
      !lines[i].match(/^[\s]*\d+\.\s+/)
    ) {
      paraLines.push(lines[i]);
      i++;
    }
    if (paraLines.length > 0) {
      blocks.push({ type: 'paragraph', content: paraLines.join('\n') });
    }
  }

  return blocks;
}

// ─── MarkdownRenderer Component ─────────────────────────────────────────────

interface MarkdownRendererProps {
  content: string;
}

export default function MarkdownRenderer({ content }: MarkdownRendererProps) {
  const blocks = useMemo(() => parseBlocks(content), [content]);

  return (
    <div className="markdown-body text-sm text-slate-300 leading-relaxed space-y-2">
      {blocks.map((block, idx) => {
        switch (block.type) {
          case 'heading': {
            const Tag = `h${block.level}` as keyof JSX.IntrinsicElements;
            const sizeClass =
              block.level === 1
                ? 'text-xl font-bold text-slate-100 mt-4 mb-2'
                : block.level === 2
                  ? 'text-lg font-bold text-slate-100 mt-3 mb-1.5'
                  : block.level === 3
                    ? 'text-base font-semibold text-slate-200 mt-2 mb-1'
                    : 'text-sm font-semibold text-slate-200 mt-2 mb-1';
            return (
              <Tag key={idx} className={sizeClass}>
                {parseInline(block.content)}
              </Tag>
            );
          }

          case 'code':
            return (
              <CodeBlock key={idx} language={block.language || ''} code={block.content} />
            );

          case 'ul':
            return (
              <ul key={idx} className="list-disc list-inside space-y-0.5 pl-2 text-slate-300">
                {block.items?.map((item, j) => (
                  <li key={j}>{parseInline(item)}</li>
                ))}
              </ul>
            );

          case 'ol':
            return (
              <ol key={idx} className="list-decimal list-inside space-y-0.5 pl-2 text-slate-300">
                {block.items?.map((item, j) => (
                  <li key={j}>{parseInline(item)}</li>
                ))}
              </ol>
            );

          case 'hr':
            return <hr key={idx} className="border-slate-700 my-4" />;

          case 'blank':
            return null;

          case 'paragraph':
          default:
            return (
              <p key={idx} className="text-slate-300 leading-relaxed">
                {parseInline(block.content)}
              </p>
            );
        }
      })}
    </div>
  );
}
