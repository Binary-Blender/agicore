import React, { useMemo, useState, useRef, useCallback } from 'react';
import { useWriterStore } from '../store/writerStore';
import type { ChapterOpenerConfig } from '../../shared/types';

interface PreviewPaneProps {
  content: string; // TipTap JSON string
  title?: string;
}

const ORNAMENT_HTML: Record<string, string> = {
  none: '',
  line: '<div class="chapter-ornament-line"></div>',
  dots: '<div class="chapter-ornament-dots"></div>',
  fleuron: '<div class="chapter-ornament-fleuron"></div>',
  diamond: '<div class="chapter-ornament-diamond"></div>',
  stars: '<div class="chapter-ornament-stars"></div>',
};

function renderNode(node: any): string {
  if (!node) return '';
  if (node.type === 'text') {
    let text = node.text || '';
    if (node.marks) {
      for (const mark of node.marks) {
        if (mark.type === 'bold') text = `<strong>${text}</strong>`;
        if (mark.type === 'italic') text = `<em>${text}</em>`;
        if (mark.type === 'strike') text = `<s>${text}</s>`;
        if (mark.type === 'highlight') text = `<mark>${text}</mark>`;
        if (mark.type === 'code') text = `<code>${text}</code>`;
      }
    }
    return text;
  }

  const children = (node.content || []).map(renderNode).join('');

  switch (node.type) {
    case 'doc': return children;
    case 'paragraph': return `<p>${children || '&nbsp;'}</p>`;
    case 'heading': {
      const level = node.attrs?.level || 1;
      return `<h${level} id="preview-heading-${level}-${children.replace(/<[^>]+>/g, '').slice(0, 30).replace(/\s+/g, '-').toLowerCase()}">${children}</h${level}>`;
    }
    case 'blockquote': return `<blockquote>${children}</blockquote>`;
    case 'bulletList': return `<ul>${children}</ul>`;
    case 'orderedList': return `<ol>${children}</ol>`;
    case 'listItem': return `<li>${children}</li>`;
    case 'codeBlock': return `<pre><code>${children}</code></pre>`;
    case 'horizontalRule': return '<hr />';
    case 'hardBreak': return '<br />';
    default: return children;
  }
}

function extractHeadings(node: any, headings: { level: number; text: string; id: string }[] = []): { level: number; text: string; id: string }[] {
  if (!node) return headings;
  if (node.type === 'heading') {
    const level = node.attrs?.level || 1;
    const text = (node.content || []).map((n: any) => n.text || '').join('');
    const id = `preview-heading-${level}-${text.slice(0, 30).replace(/\s+/g, '-').toLowerCase()}`;
    headings.push({ level, text, id });
  }
  if (node.content) {
    for (const child of node.content) {
      extractHeadings(child, headings);
    }
  }
  return headings;
}

function buildChapterOpenerHtml(title: string, config: ChapterOpenerConfig): string {
  const alignStyle = `text-align: ${config.titleAlignment || 'center'}`;
  const fontStyle = config.titleFont ? `font-family: ${config.titleFont}` : '';
  const sizes: Record<string, string> = { small: '1.5em', medium: '2em', large: '2.5em', xlarge: '3em' };
  const fontSize = sizes[config.titleSize || 'medium'] || '2em';
  const dropEm = config.lowerStart || 0;
  const ornament = ORNAMENT_HTML[config.ornament || 'none'] || '';

  return `<div class="chapter-opener" style="padding-top: ${dropEm}em; margin-bottom: 1.5em; ${alignStyle}">
    ${config.subtitleVisible ? '<div style="font-size: 0.75em; color: #999; margin-bottom: 0.25em; text-transform: uppercase; letter-spacing: 0.2em;">Chapter</div>' : ''}
    <h1 style="font-size: ${fontSize}; font-weight: 700; margin: 0; ${fontStyle}">${title}</h1>
    ${ornament}
  </div>`;
}

// Split HTML content into pages of approximately equal length
function splitIntoPages(html: string, maxCharsPerPage: number): string[] {
  const pages: string[] = [];
  // Split by block elements
  const blocks = html.split(/(?=<(?:p|h[1-6]|blockquote|ul|ol|pre|hr)[^>]*>)/i);
  let currentPage = '';
  for (const block of blocks) {
    if (currentPage.length + block.length > maxCharsPerPage && currentPage.length > 0) {
      pages.push(currentPage);
      currentPage = block;
    } else {
      currentPage += block;
    }
  }
  if (currentPage) pages.push(currentPage);
  return pages.length > 0 ? pages : [''];
}

export default function PreviewPane({ content, title }: PreviewPaneProps) {
  const [zoom, setZoom] = useState(100);
  const [showNav, setShowNav] = useState(false);
  const [spreadView, setSpreadView] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const chapterOpener = useWriterStore((s) => s.settings.chapterOpener);

  const { html, headings } = useMemo(() => {
    try {
      const json = JSON.parse(content);
      return { html: renderNode(json), headings: extractHeadings(json) };
    } catch {
      return { html: '<p class="text-surface-500">No content to preview</p>', headings: [] };
    }
  }, [content]);

  const scrollToHeading = useCallback((id: string) => {
    const container = contentRef.current;
    if (!container) return;
    const el = container.querySelector(`#${CSS.escape(id)}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    setShowNav(false);
  }, []);

  const openerHtml = title && chapterOpener ? buildChapterOpenerHtml(title, chapterOpener) : '';
  const fullHtml = openerHtml + html;

  // Spread view: split into pages
  const pages = useMemo(() => {
    if (!spreadView) return [];
    return splitIntoPages(fullHtml, 3000);
  }, [spreadView, fullHtml]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-white text-black">
      {/* Preview toolbar */}
      <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 border-b border-gray-200 shrink-0">
        <span className="text-xs text-gray-500 font-medium">Preview</span>

        <div className="flex-1" />

        {/* Spread view toggle */}
        <button
          onClick={() => setSpreadView(!spreadView)}
          className={`px-2 py-0.5 text-xs rounded transition-colors ${
            spreadView
              ? 'bg-blue-100 text-blue-700'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
          }`}
          title="Toggle spread view (two-page)"
        >
          Spread
        </button>

        {/* Navigation dropdown */}
        {headings.length > 0 && (
          <div className="relative">
            <button
              onClick={() => setShowNav(!showNav)}
              className="px-2 py-0.5 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded transition-colors"
            >
              Navigate
            </button>
            {showNav && (
              <div className="absolute top-full right-0 mt-1 w-56 bg-white border border-gray-200 rounded shadow-lg z-30 py-1 max-h-48 overflow-y-auto">
                {headings.map((h, i) => (
                  <button
                    key={i}
                    onClick={() => scrollToHeading(h.id)}
                    className="w-full text-left px-3 py-1 text-xs text-gray-700 hover:bg-gray-100 truncate"
                    style={{ paddingLeft: `${0.75 + (h.level - 1) * 0.75}rem` }}
                  >
                    {h.text || '(untitled)'}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Zoom controls */}
        <button
          onClick={() => setZoom(Math.max(50, zoom - 10))}
          className="w-6 h-6 flex items-center justify-center text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded"
          title="Zoom out"
        >
          -
        </button>
        <span className="text-xs text-gray-500 w-10 text-center">{zoom}%</span>
        <button
          onClick={() => setZoom(Math.min(200, zoom + 10))}
          className="w-6 h-6 flex items-center justify-center text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded"
          title="Zoom in"
        >
          +
        </button>
        <button
          onClick={() => setZoom(100)}
          className="px-1.5 py-0.5 text-[10px] text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded"
          title="Reset zoom"
        >
          Reset
        </button>
      </div>

      {/* Preview content */}
      <div className="flex-1 overflow-y-auto" ref={contentRef}>
        {spreadView ? (
          /* Spread (two-page) view */
          <div
            className="preview-spread"
            style={{
              transform: `scale(${zoom / 100})`,
              transformOrigin: 'top center',
            }}
          >
            {pages.length === 0 ? (
              <div className="preview-page">
                <p className="text-gray-400 text-sm">No content</p>
              </div>
            ) : (
              // Show pages in pairs (left + right)
              pages.map((pageHtml, i) => (
                <div
                  key={i}
                  className="preview-page preview-content"
                  dangerouslySetInnerHTML={{ __html: pageHtml }}
                  style={{
                    fontFamily: 'Georgia, "Times New Roman", serif',
                    fontSize: '10pt',
                    lineHeight: '1.5',
                  }}
                />
              ))
            )}
          </div>
        ) : (
          /* Single-page view */
          <div
            className="max-w-[6.5in] mx-auto px-12 py-16 min-h-full"
            style={{
              fontFamily: 'Georgia, "Times New Roman", serif',
              fontSize: `${11 * (zoom / 100)}pt`,
              lineHeight: '1.6',
              transform: `scale(${zoom / 100})`,
              transformOrigin: 'top center',
              width: `${100 / (zoom / 100)}%`,
              maxWidth: `${6.5 / (zoom / 100)}in`,
            }}
          >
            {title && !chapterOpener && (
              <div className="text-center mb-8 pb-4 border-b border-gray-300">
                <h1 className="text-2xl font-bold" style={{ fontFamily: 'Georgia, serif' }}>{title}</h1>
              </div>
            )}
            <div
              className="preview-content"
              dangerouslySetInnerHTML={{ __html: fullHtml }}
              style={{
                fontFamily: 'Georgia, "Times New Roman", serif',
                fontSize: '11pt',
                lineHeight: '1.6',
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
