import React, { useState } from 'react';
import { useWriterStore } from '../store/writerStore';

export default function SubmissionPackagePanel() {
  const {
    currentProject,
    chapters,
    submissionGenerating,
    submissionResult,
    setShowSubmissionPackage,
    generateSubmissionPackage,
    clearSubmissionResult,
  } = useWriterStore();

  const [copiedField, setCopiedField] = useState<string | null>(null);

  const totalWords = chapters.reduce((sum, ch) => sum + (ch.wordCount || 0), 0);

  const handleCopy = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleExportAll = async () => {
    if (!submissionResult || !currentProject) return;
    const text = [
      `SUBMISSION PACKAGE — ${currentProject.name}`,
      `${'='.repeat(50)}`,
      '',
      'LOGLINE',
      '-------',
      submissionResult.logline,
      '',
      'SYNOPSIS',
      '--------',
      submissionResult.synopsis,
      '',
      'QUERY LETTER',
      '------------',
      submissionResult.queryLetter,
      '',
      'AUTHOR BIO',
      '----------',
      submissionResult.authorBio,
    ].join('\n');

    await navigator.clipboard.writeText(text);
    setCopiedField('all');
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowSubmissionPackage(false)}>
      <div className="bg-[var(--bg-panel)] rounded-lg border border-[var(--border)] w-[700px] max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="p-4 border-b border-[var(--border)] flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-sm font-semibold text-surface-200">Submission Package</h2>
            <p className="text-xs text-surface-500 mt-0.5">
              AI-generated query materials for {currentProject?.name} ({totalWords.toLocaleString()} words, {chapters.length} chapters)
            </p>
          </div>
          <button onClick={() => setShowSubmissionPackage(false)} className="text-surface-500 hover:text-surface-300">x</button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {!submissionResult ? (
            <div className="text-center py-12">
              <p className="text-surface-400 text-sm mb-4">
                Generate a complete submission package including synopsis, query letter, logline, and author bio from your manuscript.
              </p>
              <p className="text-surface-500 text-xs mb-6">
                The AI will analyze your chapters and encyclopedia entries to create professional-quality submission materials.
              </p>
              <button
                onClick={generateSubmissionPackage}
                disabled={submissionGenerating || chapters.length === 0}
                className="px-6 py-2.5 text-sm bg-primary-600 hover:bg-primary-500 text-white rounded transition-colors disabled:opacity-50"
              >
                {submissionGenerating ? (
                  <span className="flex items-center gap-2">
                    <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Generating Package...
                  </span>
                ) : (
                  'Generate Submission Package'
                )}
              </button>
              {chapters.length === 0 && (
                <p className="text-xs text-red-400 mt-2">Add some chapters first</p>
              )}
            </div>
          ) : (
            <>
              {/* Action bar */}
              <div className="flex items-center gap-2 pb-2">
                <button
                  onClick={handleExportAll}
                  className="px-3 py-1.5 text-xs bg-primary-600 hover:bg-primary-500 text-white rounded transition-colors"
                >
                  {copiedField === 'all' ? 'Copied!' : 'Copy All to Clipboard'}
                </button>
                <button
                  onClick={() => { clearSubmissionResult(); }}
                  className="px-3 py-1.5 text-xs text-surface-400 hover:text-surface-200 rounded transition-colors"
                >
                  Regenerate
                </button>
              </div>

              {/* Logline */}
              <SubmissionSection
                title="Logline"
                description="One sentence that captures the essence of your story"
                content={submissionResult.logline}
                onCopy={() => handleCopy(submissionResult.logline, 'logline')}
                copied={copiedField === 'logline'}
                accentColor="text-purple-300"
                bgColor="bg-purple-600/10"
                borderColor="border-purple-500/30"
              />

              {/* Synopsis */}
              <SubmissionSection
                title="Synopsis"
                description="Complete plot summary for agents and editors"
                content={submissionResult.synopsis}
                onCopy={() => handleCopy(submissionResult.synopsis, 'synopsis')}
                copied={copiedField === 'synopsis'}
                accentColor="text-blue-300"
                bgColor="bg-blue-600/10"
                borderColor="border-blue-500/30"
              />

              {/* Query Letter */}
              <SubmissionSection
                title="Query Letter"
                description="Professional query letter template"
                content={submissionResult.queryLetter}
                onCopy={() => handleCopy(submissionResult.queryLetter, 'queryLetter')}
                copied={copiedField === 'queryLetter'}
                accentColor="text-green-300"
                bgColor="bg-green-600/10"
                borderColor="border-green-500/30"
              />

              {/* Author Bio */}
              <SubmissionSection
                title="Author Bio"
                description="Short bio template — fill in your details"
                content={submissionResult.authorBio}
                onCopy={() => handleCopy(submissionResult.authorBio, 'authorBio')}
                copied={copiedField === 'authorBio'}
                accentColor="text-orange-300"
                bgColor="bg-orange-600/10"
                borderColor="border-orange-500/30"
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function SubmissionSection({
  title,
  description,
  content,
  onCopy,
  copied,
  accentColor,
  bgColor,
  borderColor,
}: {
  title: string;
  description: string;
  content: string;
  onCopy: () => void;
  copied: boolean;
  accentColor: string;
  bgColor: string;
  borderColor: string;
}) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className={`rounded border ${borderColor} overflow-hidden`}>
      <div
        className={`flex items-center justify-between px-3 py-2 cursor-pointer ${bgColor}`}
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <span className="text-xs text-surface-500">{expanded ? '▼' : '▶'}</span>
          <span className={`text-sm font-semibold ${accentColor}`}>{title}</span>
          <span className="text-xs text-surface-500">{description}</span>
        </div>
        <button
          onClick={e => { e.stopPropagation(); onCopy(); }}
          className="px-2 py-0.5 text-xs text-surface-400 hover:text-surface-200 rounded hover:bg-white/5"
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      {expanded && (
        <div className="p-3 bg-[var(--bg-page)]">
          <pre className="text-xs text-surface-300 whitespace-pre-wrap font-sans leading-relaxed">{content}</pre>
        </div>
      )}
    </div>
  );
}
