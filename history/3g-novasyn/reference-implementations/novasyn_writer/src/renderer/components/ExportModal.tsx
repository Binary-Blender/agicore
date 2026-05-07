import React, { useState } from 'react';
import { useWriterStore } from '../store/writerStore';

export default function ExportModal() {
  const { currentProject, chapters, currentChapter, setShowExport } = useWriterStore();

  const [format, setFormat] = useState<'markdown' | 'text' | 'docx' | 'epub' | 'html' | 'audiobook' | 'pdf' | 'kindle'>('markdown');
  const [scope, setScope] = useState<'all' | 'chapter'>('all');
  const [manuscriptFormat, setManuscriptFormat] = useState(true);
  const [includeTitlePage, setIncludeTitlePage] = useState(true);
  const [includeToc, setIncludeToc] = useState(false);
  const [authorName, setAuthorName] = useState('');
  const [pdfQuality, setPdfQuality] = useState<'screen' | 'print'>('screen');
  const [includeFrontMatter, setIncludeFrontMatter] = useState(true);

  const handleExport = async () => {
    if (!currentProject) return;
    await window.electronAPI.exportProject(currentProject.id, {
      format,
      scope,
      chapterId: scope === 'chapter' ? currentChapter?.id : undefined,
      manuscriptFormat,
      includeTitlePage,
      includeToc,
      authorName: authorName.trim() || undefined,
      pdfQuality: format === 'pdf' ? pdfQuality : undefined,
      includeFrontMatter,
    });
    setShowExport(false);
  };

  const showBookOptions = format === 'docx' || format === 'epub' || format === 'html' || format === 'pdf' || format === 'kindle';
  const showAudiobookOptions = format === 'audiobook';

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-[var(--bg-panel)] rounded-lg border border-[var(--border)] w-[480px]">
        {/* Header */}
        <div className="p-4 border-b border-[var(--border)] flex items-center justify-between">
          <h2 className="text-sm font-semibold text-surface-200">Export Project</h2>
          <button
            onClick={() => setShowExport(false)}
            className="text-surface-500 hover:text-surface-300"
          >
            x
          </button>
        </div>

        {/* Options */}
        <div className="p-4 space-y-4">
          {/* Format */}
          <div>
            <label className="text-xs text-surface-500 block mb-2">Format</label>
            <div className="flex flex-wrap gap-2">
              {([
                { id: 'markdown' as const, label: 'Markdown (.md)' },
                { id: 'text' as const, label: 'Plain Text (.txt)' },
                { id: 'docx' as const, label: 'Word (.docx)' },
                { id: 'epub' as const, label: 'EPUB (.epub)' },
                { id: 'html' as const, label: 'HTML (.html)' },
                { id: 'pdf' as const, label: 'PDF (.pdf)' },
                { id: 'kindle' as const, label: 'Kindle (.epub)' },
                { id: 'audiobook' as const, label: 'Audiobook Script' },
              ]).map(f => (
                <button
                  key={f.id}
                  onClick={() => setFormat(f.id)}
                  className={`flex-1 min-w-[80px] py-2 text-xs rounded transition-colors ${
                    format === f.id
                      ? 'bg-primary-600/30 text-primary-300 border border-primary-500'
                      : 'bg-[var(--bg-page)] text-surface-400 border border-[var(--border)]'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Scope */}
          <div>
            <label className="text-xs text-surface-500 block mb-2">Scope</label>
            <div className="flex gap-2">
              <button
                onClick={() => setScope('all')}
                className={`flex-1 py-2 text-xs rounded transition-colors ${
                  scope === 'all'
                    ? 'bg-primary-600/30 text-primary-300 border border-primary-500'
                    : 'bg-[var(--bg-page)] text-surface-400 border border-[var(--border)]'
                }`}
              >
                All Chapters ({chapters.length})
              </button>
              <button
                onClick={() => setScope('chapter')}
                disabled={!currentChapter}
                className={`flex-1 py-2 text-xs rounded transition-colors ${
                  scope === 'chapter'
                    ? 'bg-primary-600/30 text-primary-300 border border-primary-500'
                    : 'bg-[var(--bg-page)] text-surface-400 border border-[var(--border)] disabled:opacity-50'
                }`}
              >
                Current Chapter
              </button>
            </div>
          </div>

          {/* Audiobook options */}
          {showAudiobookOptions && (
            <div className="space-y-2 p-3 bg-[var(--bg-page)] rounded border border-[var(--border)]">
              <label className="text-xs text-surface-500 block mb-1">Audiobook Script Options</label>
              <input
                type="text"
                value={authorName}
                onChange={e => setAuthorName(e.target.value)}
                placeholder="Author name (optional)"
                className="w-full bg-[var(--bg-panel)] text-surface-200 rounded px-2 py-1 text-xs border border-[var(--border)] focus:border-primary-500 focus:outline-none"
              />
              <p className="text-[10px] text-surface-500">
                Exports a TTS-ready script with chapter markers, pause cues, and cleaned text.
              </p>
            </div>
          )}

          {/* Book format options (DOCX, EPUB, HTML) */}
          {showBookOptions && (
            <div className="space-y-2 p-3 bg-[var(--bg-page)] rounded border border-[var(--border)]">
              <label className="text-xs text-surface-500 block mb-1">
                {format === 'docx' ? 'Word Document Options' : format === 'epub' ? 'EPUB Options' : 'HTML Options'}
              </label>

              {/* Author name (EPUB, HTML, PDF) */}
              {(format === 'epub' || format === 'html' || format === 'pdf') && (
                <div className="mb-2">
                  <input
                    type="text"
                    value={authorName}
                    onChange={e => setAuthorName(e.target.value)}
                    placeholder="Author name (optional)"
                    className="w-full bg-[var(--bg-panel)] text-surface-200 rounded px-2 py-1 text-xs border border-[var(--border)] focus:border-primary-500 focus:outline-none"
                  />
                </div>
              )}

              {/* Manuscript format (DOCX only) */}
              {format === 'docx' && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={manuscriptFormat}
                    onChange={e => setManuscriptFormat(e.target.checked)}
                    className="accent-primary-500"
                  />
                  <span className="text-xs text-surface-300">
                    Manuscript Format
                    <span className="text-surface-500 ml-1">(Times New Roman 12pt, double-spaced, 1" margins)</span>
                  </span>
                </label>
              )}

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeTitlePage}
                  onChange={e => setIncludeTitlePage(e.target.checked)}
                  className="accent-primary-500"
                />
                <span className="text-xs text-surface-300">Include Title Page</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeToc}
                  onChange={e => setIncludeToc(e.target.checked)}
                  className="accent-primary-500"
                />
                <span className="text-xs text-surface-300">Include Table of Contents</span>
              </label>

              {/* Front matter (PDF, EPUB, Kindle) */}
              {(format === 'pdf' || format === 'epub' || format === 'kindle') && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeFrontMatter}
                    onChange={e => setIncludeFrontMatter(e.target.checked)}
                    className="accent-primary-500"
                  />
                  <span className="text-xs text-surface-300">
                    Include Front Matter
                    <span className="text-surface-500 ml-1">(title, copyright, dedication — configure in Settings)</span>
                  </span>
                </label>
              )}

              {/* PDF Quality (PDF only) */}
              {format === 'pdf' && (
                <div>
                  <label className="text-xs text-surface-500 block mb-1">PDF Quality</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPdfQuality('screen')}
                      className={`flex-1 py-1.5 text-xs rounded transition-colors ${
                        pdfQuality === 'screen'
                          ? 'bg-primary-600/30 text-primary-300 border border-primary-500'
                          : 'bg-[var(--bg-panel)] text-surface-400 border border-[var(--border)]'
                      }`}
                    >
                      Screen (Letter)
                    </button>
                    <button
                      onClick={() => setPdfQuality('print')}
                      className={`flex-1 py-1.5 text-xs rounded transition-colors ${
                        pdfQuality === 'print'
                          ? 'bg-primary-600/30 text-primary-300 border border-primary-500'
                          : 'bg-[var(--bg-panel)] text-surface-400 border border-[var(--border)]'
                      }`}
                    >
                      Print-Ready (6×9)
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[var(--border)] flex justify-end gap-2">
          <button
            onClick={() => setShowExport(false)}
            className="px-3 py-1.5 text-xs text-surface-400 hover:text-surface-200 rounded transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            className="px-4 py-1.5 text-xs bg-primary-600 hover:bg-primary-500 text-white rounded transition-colors"
          >
            Export
          </button>
        </div>
      </div>
    </div>
  );
}
