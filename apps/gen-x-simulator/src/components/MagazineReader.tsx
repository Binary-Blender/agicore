import React, { useState } from 'react';
import type { Lesson } from '../types';

interface Props {
  lessons: Lesson[];
  onClose: () => void;
  onTypeIn: (lesson: Lesson) => void;
}

const MagazineReader: React.FC<Props> = ({ lessons, onClose, onTypeIn }) => {
  const [selected, setSelected] = useState<Lesson | null>(lessons[0] ?? null);

  return (
    <div
      className="fixed inset-0 z-40 flex items-stretch justify-center bg-black/80"
      onClick={onClose}
    >
      <div
        className="flex w-[95vw] h-[92vh] my-auto max-w-6xl rounded-lg overflow-hidden bg-[var(--bg-panel)] border border-[var(--border)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sidebar — magazine rack */}
        <div className="w-64 border-r border-[var(--border)] overflow-y-auto">
          <div className="px-4 py-3 border-b border-[var(--border)]">
            <p className="text-xs uppercase tracking-widest text-[var(--text-muted)]">
              Magazine Rack
            </p>
          </div>
          <ul>
            {lessons.map((l) => (
              <li
                key={l.id}
                onClick={() => setSelected(l)}
                className={`px-4 py-3 cursor-pointer border-b border-[var(--border)] hover:bg-[var(--bg-input)] ${
                  selected?.id === l.id ? 'bg-[var(--bg-input)]' : ''
                }`}
              >
                <p className="text-[10px] uppercase tracking-widest text-[var(--text-muted)]">
                  {l.magazineTitle}
                </p>
                <p className="text-sm font-semibold mt-1">{l.title}</p>
                <p className="text-xs text-[var(--text-secondary)] mt-1">
                  {l.magazineIssue} · p.{l.page}
                </p>
              </li>
            ))}
          </ul>
        </div>

        {/* Page */}
        <div className="flex-1 overflow-y-auto bg-black/40 py-10">
          {selected ? (
            <article className="magazine">
              <div className="masthead">
                {selected.magazineTitle} · {selected.magazineIssue} · page {selected.page}
              </div>
              <h1>{selected.title}</h1>
              <RenderedMarkdown source={selected.articleMarkdown} />
              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => onTypeIn(selected)}
                  className="bg-[var(--news-ink)] text-[var(--news-paper)] px-4 py-2 text-xs uppercase tracking-widest font-bold"
                >
                  Type this listing into the editor
                </button>
                <button
                  onClick={onClose}
                  className="border border-[var(--news-ink)] px-4 py-2 text-xs uppercase tracking-widest"
                >
                  Close magazine
                </button>
              </div>
            </article>
          ) : (
            <p className="text-center text-[var(--text-muted)] mt-20">No magazines yet.</p>
          )}
        </div>
      </div>
    </div>
  );
};

// Minimal markdown rendering — headings, paragraphs, code fences, horizontal rules, emphasis
const RenderedMarkdown: React.FC<{ source: string }> = ({ source }) => {
  const blocks = parseBlocks(source);
  return (
    <>
      {blocks.map((b, i) => {
        switch (b.kind) {
          case 'h2':   return <h2 key={i}>{b.text}</h2>;
          case 'h3':   return <h3 key={i}>{b.text}</h3>;
          case 'hr':   return <hr key={i} />;
          case 'code': return <pre key={i}><code>{b.text}</code></pre>;
          case 'p':    return <p key={i} dangerouslySetInnerHTML={{ __html: inlineMd(b.text) }} />;
        }
      })}
    </>
  );
};

type Block =
  | { kind: 'h2'; text: string }
  | { kind: 'h3'; text: string }
  | { kind: 'hr' }
  | { kind: 'code'; text: string }
  | { kind: 'p'; text: string };

function parseBlocks(src: string): Block[] {
  const lines = src.split('\n');
  const out: Block[] = [];
  let i = 0;
  let para: string[] = [];
  const flushPara = () => {
    if (para.length) {
      out.push({ kind: 'p', text: para.join(' ').trim() });
      para = [];
    }
  };
  while (i < lines.length) {
    const line = lines[i];
    if (line.startsWith('```')) {
      flushPara();
      i += 1;
      const codeLines: string[] = [];
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i]);
        i += 1;
      }
      i += 1;
      out.push({ kind: 'code', text: codeLines.join('\n') });
      continue;
    }
    if (line.startsWith('## ')) {
      flushPara();
      out.push({ kind: 'h2', text: line.slice(3).trim() });
      i += 1;
      continue;
    }
    if (line.startsWith('### ')) {
      flushPara();
      out.push({ kind: 'h3', text: line.slice(4).trim() });
      i += 1;
      continue;
    }
    if (line.trim() === '---') {
      flushPara();
      out.push({ kind: 'hr' });
      i += 1;
      continue;
    }
    if (line.trim() === '') {
      flushPara();
      i += 1;
      continue;
    }
    para.push(line);
    i += 1;
  }
  flushPara();
  return out;
}

function inlineMd(t: string): string {
  return t
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>');
}

export default MagazineReader;
