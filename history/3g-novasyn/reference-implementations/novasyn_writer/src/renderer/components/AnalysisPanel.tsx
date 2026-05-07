import React, { useState, useEffect } from 'react';
import { useWriterStore } from '../store/writerStore';

type Tab = 'pacing' | 'readability' | 'voice_audit' | 'consistency';

export default function AnalysisPanel() {
  const {
    currentProject,
    chapters,
    currentChapter,
    setShowAnalysis,
    runAnalysis,
    loadReadability,
    analysisRunning,
    analysisType,
    analysisResults,
    readabilityResults,
    clearAnalysisResults,
    analyses,
    loadAnalyses,
    deleteAnalysis,
  } = useWriterStore();

  const [activeTab, setActiveTab] = useState<Tab>('readability');
  const [scope, setScope] = useState<'project' | 'chapter'>('project');
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    loadAnalyses();
  }, []);

  // Auto-load readability when switching to that tab
  useEffect(() => {
    if (activeTab === 'readability' && currentProject) {
      loadReadability(scope === 'chapter' ? currentChapter?.id : undefined);
    }
  }, [activeTab, scope, currentChapter?.id]);

  const handleRunAnalysis = () => {
    const chapterId = scope === 'chapter' ? currentChapter?.id : undefined;
    runAnalysis(activeTab, chapterId);
  };

  const tabs: { id: Tab; label: string; ai: boolean }[] = [
    { id: 'readability', label: 'Readability', ai: false },
    { id: 'pacing', label: 'Pacing', ai: true },
    { id: 'voice_audit', label: 'Voice Audit', ai: true },
    { id: 'consistency', label: 'Consistency', ai: true },
  ];

  const PACING_COLORS: Record<string, string> = {
    action: 'bg-red-500',
    dialogue: 'bg-blue-500',
    reflection: 'bg-purple-500',
    description: 'bg-green-500',
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-[var(--bg-panel)] rounded-lg border border-[var(--border)] w-[720px] max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-[var(--border)] flex items-center justify-between">
          <h2 className="text-sm font-semibold text-surface-200">Manuscript Analysis</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="text-xs text-surface-400 hover:text-surface-200"
            >
              {showHistory ? 'Hide History' : 'History'}
            </button>
            <button onClick={() => setShowAnalysis(false)} className="text-surface-500 hover:text-surface-300">x</button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[var(--border)]">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); clearAnalysisResults(); }}
              className={`flex-1 px-3 py-2.5 text-xs transition-colors ${
                activeTab === tab.id
                  ? 'text-primary-300 border-b-2 border-primary-400 bg-primary-600/10'
                  : 'text-surface-400 hover:text-surface-200 hover:bg-white/5'
              }`}
            >
              {tab.label} {tab.ai && <span className="text-accent-400 ml-1">AI</span>}
            </button>
          ))}
        </div>

        {/* Scope selector + Run button */}
        <div className="p-3 border-b border-[var(--border)] flex items-center gap-2">
          <span className="text-xs text-surface-500">Scope:</span>
          <button
            onClick={() => setScope('project')}
            className={`px-2 py-1 text-xs rounded ${
              scope === 'project' ? 'bg-primary-600/30 text-primary-300' : 'text-surface-400 hover:bg-white/5'
            }`}
          >
            Whole Project
          </button>
          <button
            onClick={() => setScope('chapter')}
            disabled={!currentChapter}
            className={`px-2 py-1 text-xs rounded ${
              scope === 'chapter' ? 'bg-primary-600/30 text-primary-300' : 'text-surface-400 hover:bg-white/5 disabled:opacity-40'
            }`}
          >
            {currentChapter ? currentChapter.title : 'No Chapter'}
          </button>
          <div className="flex-1" />
          {activeTab !== 'readability' && (
            <button
              onClick={handleRunAnalysis}
              disabled={analysisRunning}
              className="px-3 py-1.5 text-xs bg-primary-600 hover:bg-primary-500 disabled:opacity-50 text-white rounded transition-colors"
            >
              {analysisRunning && analysisType === activeTab ? 'Analyzing...' : 'Run Analysis'}
            </button>
          )}
        </div>

        {/* Content area */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* History panel */}
          {showHistory && (
            <div className="mb-4 p-3 bg-[var(--bg-page)] rounded border border-[var(--border)]">
              <h3 className="text-xs font-semibold text-surface-400 mb-2">Past Analyses</h3>
              {analyses.filter(a => a.analysisType === activeTab).length === 0 ? (
                <p className="text-xs text-surface-600">No past {activeTab} analyses.</p>
              ) : (
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {analyses.filter(a => a.analysisType === activeTab).map(a => (
                    <div key={a.id} className="flex items-center justify-between text-xs">
                      <button
                        onClick={() => {
                          useWriterStore.setState({ analysisResults: a.results, analysisType: a.analysisType });
                        }}
                        className="text-surface-300 hover:text-primary-300"
                      >
                        {new Date(a.createdAt).toLocaleDateString()} {new Date(a.createdAt).toLocaleTimeString()}
                        {a.chapterId && ' (chapter)'}
                      </button>
                      <button onClick={() => deleteAnalysis(a.id)} className="text-red-400/60 hover:text-red-400">x</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab content */}
          {activeTab === 'readability' && <ReadabilityTab results={readabilityResults} />}
          {activeTab === 'pacing' && <PacingTab results={analysisResults} loading={analysisRunning && analysisType === 'pacing'} colors={PACING_COLORS} />}
          {activeTab === 'voice_audit' && <VoiceAuditTab results={analysisResults} loading={analysisRunning && analysisType === 'voice_audit'} />}
          {activeTab === 'consistency' && <ConsistencyTab results={analysisResults} loading={analysisRunning && analysisType === 'consistency'} />}
        </div>
      </div>
    </div>
  );
}

function ReadabilityTab({ results }: { results: any }) {
  if (!results) return <p className="text-xs text-surface-500">Loading readability metrics...</p>;

  const { fleschKincaid, avgSentenceLength, avgWordLength, paragraphCount, dialoguePercentage, overusedWords, sentenceLengths } = results;

  // Sentence length variation
  const avgLen = sentenceLengths.length > 0 ? sentenceLengths.reduce((a: number, b: number) => a + b, 0) / sentenceLengths.length : 0;
  const stdDev = sentenceLengths.length > 1
    ? Math.sqrt(sentenceLengths.reduce((sum: number, l: number) => sum + (l - avgLen) ** 2, 0) / sentenceLengths.length)
    : 0;
  const variationScore = avgLen > 0 ? Math.round((stdDev / avgLen) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Reading Level" value={`Grade ${fleschKincaid}`} sub={fleschKincaid < 8 ? 'Easy' : fleschKincaid < 12 ? 'Medium' : 'Advanced'} />
        <StatCard label="Avg Sentence" value={`${avgSentenceLength} words`} sub={avgSentenceLength > 25 ? 'Long — consider varying' : 'Good length'} />
        <StatCard label="Avg Word Length" value={`${avgWordLength} chars`} sub={avgWordLength > 5.5 ? 'Dense vocabulary' : 'Accessible'} />
        <StatCard label="Paragraphs" value={String(paragraphCount)} sub="" />
        <StatCard label="Dialogue" value={`${dialoguePercentage}%`} sub={dialoguePercentage < 15 ? 'Low dialogue' : dialoguePercentage > 60 ? 'Heavy dialogue' : 'Balanced'} />
        <StatCard label="Sentence Variation" value={`${variationScore}%`} sub={variationScore < 30 ? 'Monotonous — vary length' : 'Good variation'} />
      </div>

      {/* Overused words */}
      {overusedWords.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-surface-400 mb-2">Overused Words</h3>
          <div className="flex flex-wrap gap-1.5">
            {overusedWords.map((w: any) => (
              <span
                key={w.word}
                className="px-2 py-1 text-xs bg-orange-600/20 text-orange-300 border border-orange-500/30 rounded"
              >
                {w.word} <span className="text-orange-400/60">x{w.count}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Sentence length histogram */}
      {sentenceLengths.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-surface-400 mb-2">Sentence Length Distribution</h3>
          <div className="h-24 flex items-end gap-px">
            {(() => {
              const buckets = Array(10).fill(0);
              const maxLen = Math.max(...sentenceLengths, 1);
              const bucketSize = Math.ceil(maxLen / 10);
              sentenceLengths.forEach((l: number) => {
                const idx = Math.min(9, Math.floor(l / bucketSize));
                buckets[idx]++;
              });
              const maxBucket = Math.max(...buckets, 1);
              return buckets.map((count: number, i: number) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                  <div
                    className="w-full bg-primary-500/50 rounded-t"
                    style={{ height: `${(count / maxBucket) * 100}%`, minHeight: count > 0 ? 2 : 0 }}
                  />
                  <span className="text-[9px] text-surface-600">{i * bucketSize + 1}</span>
                </div>
              ));
            })()}
          </div>
          <p className="text-[9px] text-surface-600 text-center mt-0.5">words per sentence</p>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="bg-[var(--bg-page)] border border-[var(--border)] rounded p-3">
      <p className="text-[10px] text-surface-500 mb-1">{label}</p>
      <p className="text-lg font-semibold text-surface-200">{value}</p>
      {sub && <p className="text-[10px] text-surface-500 mt-0.5">{sub}</p>}
    </div>
  );
}

function PacingTab({ results, loading, colors }: { results: any; loading: boolean; colors: Record<string, string> }) {
  if (loading) return <p className="text-xs text-surface-400 animate-pulse">Analyzing pacing...</p>;
  if (!results) return <p className="text-xs text-surface-500">Click "Run Analysis" to analyze pacing across your manuscript.</p>;

  const data = results.chapters || results;
  const overall = results.overall;

  return (
    <div className="space-y-4">
      {/* Legend */}
      <div className="flex gap-3">
        {Object.entries(colors).map(([type, color]) => (
          <div key={type} className="flex items-center gap-1.5">
            <div className={`w-3 h-3 rounded-sm ${color}`} />
            <span className="text-xs text-surface-400 capitalize">{type}</span>
          </div>
        ))}
      </div>

      {/* Bars per chapter */}
      {Array.isArray(data) && data.map((ch: any, i: number) => (
        <div key={i}>
          <p className="text-xs text-surface-300 mb-1">{ch.title}</p>
          <div className="flex h-6 rounded overflow-hidden">
            {(ch.segments || []).map((seg: any, j: number) => (
              <div
                key={j}
                className={`${colors[seg.type] || 'bg-gray-500'} flex items-center justify-center`}
                style={{ width: `${seg.percentage}%` }}
                title={`${seg.type}: ${seg.percentage}%`}
              >
                {seg.percentage >= 10 && <span className="text-[9px] text-white/80">{seg.percentage}%</span>}
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Overall assessment */}
      {overall && (
        <div className="mt-3 p-3 bg-[var(--bg-page)] border border-primary-500/30 rounded">
          <p className="text-xs text-surface-300">{overall}</p>
        </div>
      )}
    </div>
  );
}

function VoiceAuditTab({ results, loading }: { results: any; loading: boolean }) {
  if (loading) return <p className="text-xs text-surface-400 animate-pulse">Auditing character voices...</p>;
  if (!results) return <p className="text-xs text-surface-500">Click "Run Analysis" to compare how your characters speak.</p>;

  const items = Array.isArray(results) ? results : [];

  if (items.length === 0) {
    return (
      <div className="p-4 bg-green-600/10 border border-green-500/30 rounded text-center">
        <p className="text-sm text-green-300">All characters have distinct voices!</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item: any, i: number) => (
        <div key={i} className="p-3 bg-[var(--bg-page)] border border-orange-500/30 rounded">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-surface-200">
              {item.character1} & {item.character2}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded ${
              item.similarity >= 80 ? 'bg-red-600/30 text-red-300' :
              item.similarity >= 60 ? 'bg-orange-600/30 text-orange-300' :
              'bg-yellow-600/30 text-yellow-300'
            }`}>
              {item.similarity}% similar
            </span>
          </div>
          {item.examples && (
            <ul className="text-xs text-surface-400 mb-2 space-y-0.5">
              {item.examples.map((ex: string, j: number) => (
                <li key={j}>- {ex}</li>
              ))}
            </ul>
          )}
          {item.suggestion && (
            <p className="text-xs text-primary-300/80 italic">{item.suggestion}</p>
          )}
        </div>
      ))}
    </div>
  );
}

function ConsistencyTab({ results, loading }: { results: any; loading: boolean }) {
  if (loading) return <p className="text-xs text-surface-400 animate-pulse">Checking consistency...</p>;
  if (!results) return <p className="text-xs text-surface-500">Click "Run Analysis" to check manuscript against encyclopedia.</p>;

  const items = Array.isArray(results) ? results : [];

  if (items.length === 0) {
    return (
      <div className="p-4 bg-green-600/10 border border-green-500/30 rounded text-center">
        <p className="text-sm text-green-300">No inconsistencies found!</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item: any, i: number) => (
        <div key={i} className="p-3 bg-[var(--bg-page)] border border-red-500/30 rounded">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-xs font-semibold text-surface-200">{item.entry}</span>
            {item.chapter && <span className="text-[10px] text-surface-500">in {item.chapter}</span>}
          </div>
          <p className="text-xs text-red-300 mb-1">{item.issue}</p>
          {item.quote && (
            <p className="text-xs text-surface-500 italic mb-1">"{item.quote}"</p>
          )}
          {item.suggestion && (
            <p className="text-xs text-primary-300/80">{item.suggestion}</p>
          )}
        </div>
      ))}
    </div>
  );
}
