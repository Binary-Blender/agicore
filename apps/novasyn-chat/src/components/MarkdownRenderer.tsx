import React, { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';

// Renders inline markdown: **bold**, *italic*, `code`
function renderInline(text: string, baseKey: string): React.ReactNode {
  const pattern = /(\*\*(.+?)\*\*|\*(.+?)\*|`([^`]+?)`)/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;
  let i = 0;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    if (match[2] !== undefined) {
      parts.push(<strong key={`${baseKey}-b${i++}`} className="font-semibold text-white">{match[2]}</strong>);
    } else if (match[3] !== undefined) {
      parts.push(<em key={`${baseKey}-i${i++}`} className="italic text-gray-200">{match[3]}</em>);
    } else if (match[4] !== undefined) {
      parts.push(
        <code key={`${baseKey}-c${i++}`} className="bg-slate-700 px-1.5 py-0.5 rounded text-yellow-300 font-mono text-xs">
          {match[4]}
        </code>
      );
    }
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts.length === 1 ? parts[0] : <>{parts}</>;
}

function CodeBlock({ code, lang }: { code: string; lang?: string }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="my-3 rounded-lg overflow-hidden border border-slate-600 group/code">
      <div className="bg-slate-700 px-3 py-1 flex items-center justify-between border-b border-slate-600">
        <span className="text-xs text-gray-400 font-mono">{lang || 'code'}</span>
        <button
          onClick={handleCopy}
          className="text-xs text-gray-400 hover:text-white transition px-1.5 py-0.5 rounded hover:bg-slate-600"
        >
          {copied ? '✓ Copied' : 'Copy'}
        </button>
      </div>
      <pre className="bg-slate-900 p-3 overflow-x-auto">
        <code className="text-emerald-300 font-mono text-xs leading-relaxed whitespace-pre">
          {code}
        </code>
      </pre>
    </div>
  );
}

function DocumentBlock({ title, content, language }: { title: string; content: string; language: string }) {
  const [created, setCreated] = useState(false);
  const [collapsed, setCollapsed] = useState(content.split('\n').length > 30);

  async function handleCreate() {
    try {
      await invoke('create_document', { input: { title, filePath: title, language } });
      setCreated(true);
    } catch (err) {
      console.error('Failed to create document:', err);
    }
  }

  const displayContent = collapsed ? content.split('\n').slice(0, 25).join('\n') + '\n...' : content;
  const lineCount = content.split('\n').length;

  return (
    <div className="my-3 rounded-lg overflow-hidden border border-blue-500/40 bg-slate-800/60">
      <div className="bg-blue-900/30 px-3 py-2 flex items-center justify-between border-b border-blue-500/30">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-blue-300">{title}</span>
          <span className="text-xs text-gray-500">{language} · {lineCount} lines</span>
        </div>
        <button
          onClick={handleCreate}
          disabled={created}
          className={`text-xs px-3 py-1 rounded transition font-medium ${
            created
              ? 'bg-green-600/20 text-green-400 cursor-default'
              : 'bg-blue-600 hover:bg-blue-500 text-white'
          }`}
        >
          {created ? 'Opened' : 'Open as Document'}
        </button>
      </div>
      <div className="relative">
        <pre className="p-3 overflow-x-auto max-h-[400px] overflow-y-auto">
          <code className="text-gray-300 font-mono text-xs leading-relaxed whitespace-pre">
            {displayContent}
          </code>
        </pre>
        {collapsed && (
          <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-slate-800/90 to-transparent flex items-end justify-center pb-2">
            <button
              onClick={() => setCollapsed(false)}
              className="text-xs text-blue-400 hover:text-blue-300 transition"
            >
              Show all {lineCount} lines
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function parseTableRow(line: string): string[] {
  return line.replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());
}

function parseAlignment(sep: string): ('left' | 'center' | 'right')[] {
  return parseTableRow(sep).map((cell) => {
    const left = cell.startsWith(':');
    const right = cell.endsWith(':');
    if (left && right) return 'center';
    if (right) return 'right';
    return 'left';
  });
}

function TableBlock({ rows, baseKey }: { rows: string[]; baseKey: string }) {
  if (rows.length < 2) return null;
  const headers = parseTableRow(rows[0]);
  const isSep = (line: string) => /^\|[\s:|-]+\|$/.test(line.trim());
  const sepIdx = isSep(rows[1]) ? 1 : -1;
  const align = sepIdx >= 0 ? parseAlignment(rows[sepIdx]) : headers.map(() => 'left' as const);
  const dataRows = rows.slice(sepIdx >= 0 ? 2 : 1);

  return (
    <div className="my-3 overflow-x-auto rounded-lg border border-slate-600">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-700/80">
            {headers.map((h, i) => (
              <th
                key={`${baseKey}-th-${i}`}
                className="px-3 py-2 text-left text-xs font-semibold text-gray-300 border-b border-slate-600"
                style={{ textAlign: align[i] }}
              >
                {renderInline(h, `${baseKey}-th-${i}`)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {dataRows.map((row, ri) => {
            const cells = parseTableRow(row);
            return (
              <tr key={`${baseKey}-tr-${ri}`} className={ri % 2 === 0 ? 'bg-slate-800/40' : 'bg-slate-800/70'}>
                {headers.map((_, ci) => (
                  <td
                    key={`${baseKey}-td-${ri}-${ci}`}
                    className="px-3 py-2 text-gray-200 border-b border-slate-700/50"
                    style={{ textAlign: align[ci] }}
                  >
                    {renderInline(cells[ci] ?? '', `${baseKey}-td-${ri}-${ci}`)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

interface Props {
  content: string;
}

function splitDocumentBlocks(text: string): { kind: 'text' | 'document'; content: string; title?: string; language?: string }[] {
  const parts: { kind: 'text' | 'document'; content: string; title?: string; language?: string }[] = [];
  const docRe = /<document\s+([^>]*)>([\s\S]*?)<\/document>/gi;
  let lastIdx = 0;
  let m: RegExpExecArray | null;

  while ((m = docRe.exec(text)) !== null) {
    if (m.index > lastIdx) {
      parts.push({ kind: 'text', content: text.slice(lastIdx, m.index) });
    }
    const attrs = m[1];
    const title = attrs.match(/title=["']([^"']+)["']/)?.[1] ?? 'Untitled';
    const language = attrs.match(/language=["']([^"']+)["']/)?.[1] ?? 'markdown';
    parts.push({ kind: 'document', content: m[2].trim(), title, language });
    lastIdx = m.index + m[0].length;
  }

  if (lastIdx < text.length) {
    parts.push({ kind: 'text', content: text.slice(lastIdx) });
  }
  return parts;
}

function renderMarkdownText(text: string, startKey: number): { elements: React.ReactNode[]; nextKey: number } {
  const elements: React.ReactNode[] = [];
  let key = startKey;

  const codeBlockRe = /```(\w*)\n?([\s\S]*?)```/g;
  const segments: { kind: 'text' | 'code'; content: string; lang?: string }[] = [];
  let lastIdx = 0;
  let m: RegExpExecArray | null;

  while ((m = codeBlockRe.exec(text)) !== null) {
    if (m.index > lastIdx) segments.push({ kind: 'text', content: text.slice(lastIdx, m.index) });
    segments.push({ kind: 'code', content: m[2] ?? '', lang: m[1] || undefined });
    lastIdx = m.index + m[0].length;
  }
  if (lastIdx < text.length) segments.push({ kind: 'text', content: text.slice(lastIdx) });

  for (const seg of segments) {
    if (seg.kind === 'code') {
      elements.push(<CodeBlock key={key++} code={seg.content.trim()} lang={seg.lang} />);
      continue;
    }

    const lines = seg.content.split('\n');
    let listItems: { ordered: boolean; text: string }[] = [];
    let tableRows: string[] = [];

    const flushList = () => {
      if (!listItems.length) return;
      const ordered = listItems[0].ordered;
      const Tag = ordered ? 'ol' : 'ul';
      elements.push(
        <Tag key={key++} className={`my-2 ml-5 space-y-0.5 ${ordered ? 'list-decimal' : 'list-disc'}`}>
          {listItems.map((item, idx) => (
            <li key={idx} className="text-sm text-gray-100 leading-relaxed">
              {renderInline(item.text, `li-${key}-${idx}`)}
            </li>
          ))}
        </Tag>
      );
      listItems = [];
    };

    const flushTable = () => {
      if (!tableRows.length) return;
      elements.push(<TableBlock key={key++} rows={tableRows} baseKey={`tbl-${key}`} />);
      tableRows = [];
    };

    const isTableLine = (l: string) => l.trimStart().startsWith('|') && l.trimEnd().endsWith('|');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (isTableLine(line)) { flushList(); tableRows.push(line); continue; }
      if (tableRows.length) flushTable();

      const hMatch = line.match(/^(#{1,4})\s+(.+)/);
      if (hMatch) {
        flushList();
        const level = hMatch[1].length;
        const sizes = ['', 'text-xl', 'text-lg', 'text-base', 'text-sm'];
        elements.push(
          <div key={key++} className={`${sizes[level] ?? 'text-base'} font-bold text-white mt-4 mb-1`}>
            {renderInline(hMatch[2], `h${key}`)}
          </div>
        );
        continue;
      }

      const ulMatch = line.match(/^[-*•]\s+(.+)/);
      if (ulMatch) {
        if (listItems.length && listItems[0].ordered) flushList();
        listItems.push({ ordered: false, text: ulMatch[1] });
        continue;
      }

      const olMatch = line.match(/^\d+\.\s+(.+)/);
      if (olMatch) {
        if (listItems.length && !listItems[0].ordered) flushList();
        listItems.push({ ordered: true, text: olMatch[1] });
        continue;
      }

      if (!line.trim()) {
        flushList();
        if (i > 0 && lines[i - 1]?.trim()) {
          elements.push(<div key={key++} className="h-1.5" />);
        }
        continue;
      }

      flushList();
      elements.push(
        <p key={key++} className="text-sm text-gray-100 leading-relaxed">
          {renderInline(line, `p${key}`)}
        </p>
      );
    }

    flushList();
    flushTable();
  }

  return { elements, nextKey: key };
}

export function MarkdownRenderer({ content }: Props) {
  const allElements: React.ReactNode[] = [];
  let key = 0;

  const docParts = splitDocumentBlocks(content);

  for (const part of docParts) {
    if (part.kind === 'document') {
      allElements.push(
        <DocumentBlock key={key++} title={part.title!} content={part.content} language={part.language!} />
      );
    } else {
      const trimmed = part.content.trim();
      if (!trimmed) continue;
      const { elements, nextKey } = renderMarkdownText(trimmed, key);
      allElements.push(...elements);
      key = nextKey;
    }
  }

  return <div className="space-y-0.5">{allElements}</div>;
}
