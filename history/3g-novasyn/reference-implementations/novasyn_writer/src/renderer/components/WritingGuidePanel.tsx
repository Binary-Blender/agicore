import React, { useState, useRef, useEffect } from 'react';
import { useWriterStore } from '../store/writerStore';

const JOURNEY_STARTERS = [
  { label: 'I have an idea for a book', prompt: "I have an idea for a book but I'm not sure where to start. Can you help me develop it into a workable concept?" },
  { label: "I'm stuck on my writing", prompt: "I'm feeling stuck with my writing. Can you help me figure out what's blocking me and suggest ways to move forward?" },
  { label: 'Help me improve this chapter', prompt: "Can you review my current chapter and give me specific, actionable feedback on how to improve it?" },
  { label: 'Teach me a writing technique', prompt: "I'd like to learn about a writing technique that could improve my craft. What would you recommend based on my current project?" },
  { label: 'Help me plan my next chapter', prompt: "I need to plan what happens next in my story. Can you help me outline the next chapter based on where my story is?" },
  { label: 'How do I use this app?', prompt: "I'm new to NovaSyn Writer. Can you walk me through the main features and how to get the most out of the app?" },
];

export default function WritingGuidePanel() {
  const {
    guideMessages,
    guideLoading,
    currentProject,
    setShowWritingGuide,
    sendGuideMessage,
    clearGuideMessages,
  } = useWriterStore();

  const [input, setInput] = useState('');
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [guideMessages, guideLoading]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || guideLoading) return;
    setInput('');
    sendGuideMessage(trimmed);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleJourneyStart = (prompt: string) => {
    sendGuideMessage(prompt);
  };

  const hasMessages = guideMessages.length > 0;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="w-[720px] max-h-[85vh] flex flex-col bg-[#16213e] rounded-lg border border-white/10 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary-600/30 flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-primary-400">
                <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.5 3.5l1.4 1.4M11.1 11.1l1.4 1.4M3.5 12.5l1.4-1.4M11.1 4.9l1.4-1.4" />
                <circle cx="8" cy="8" r="3" />
              </svg>
            </div>
            <div>
              <h2 className="text-sm font-semibold text-surface-200">Writing Guide</h2>
              <p className="text-[10px] text-surface-500">Your AI writing coach & app guide</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {hasMessages && (
              <button
                onClick={() => setShowClearConfirm(true)}
                className="text-xs text-surface-500 hover:text-red-400 transition-colors"
                title="Clear conversation"
              >
                Clear
              </button>
            )}
            <button
              onClick={() => setShowWritingGuide(false)}
              className="text-surface-500 hover:text-surface-300 text-lg leading-none"
            >
              &times;
            </button>
          </div>
        </div>

        {/* Clear confirmation */}
        {showClearConfirm && (
          <div className="px-5 py-2 bg-red-900/20 border-b border-red-500/20 flex items-center justify-between">
            <span className="text-xs text-red-300">Clear all conversation history?</span>
            <div className="flex gap-2">
              <button
                onClick={() => { clearGuideMessages(); setShowClearConfirm(false); }}
                className="text-xs px-2 py-1 bg-red-600 text-white rounded hover:bg-red-500"
              >
                Clear
              </button>
              <button
                onClick={() => setShowClearConfirm(false)}
                className="text-xs px-2 py-1 text-surface-400 hover:text-surface-200"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 min-h-0">
          {!hasMessages && !guideLoading && (
            <div className="space-y-6">
              {/* Welcome */}
              <div className="text-center py-4">
                <h3 className="text-lg font-semibold text-surface-200 mb-2">
                  Welcome to your Writing Guide
                </h3>
                <p className="text-sm text-surface-400 max-w-md mx-auto">
                  I know everything about NovaSyn Writer and your project. Ask me anything about writing craft, your story, or how to use the app.
                </p>
                {currentProject && (
                  <p className="text-xs text-primary-400/70 mt-2">
                    Currently working on: {currentProject.name}
                  </p>
                )}
              </div>

              {/* Journey starters */}
              <div>
                <p className="text-xs text-surface-500 mb-3 text-center">Quick start:</p>
                <div className="grid grid-cols-2 gap-2">
                  {JOURNEY_STARTERS.map((j) => (
                    <button
                      key={j.label}
                      onClick={() => handleJourneyStart(j.prompt)}
                      className="text-left p-3 rounded-lg border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] hover:border-primary-500/30 transition-all text-xs text-surface-300"
                    >
                      {j.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Message list */}
          {guideMessages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-lg px-4 py-2.5 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-primary-600/20 text-surface-200'
                    : 'bg-white/[0.04] text-surface-300 border border-white/5'
                }`}
              >
                <MessageContent content={msg.content} />
                <div className="text-[10px] text-surface-600 mt-1.5">
                  {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          ))}

          {/* Loading indicator */}
          {guideLoading && (
            <div className="flex justify-start">
              <div className="bg-white/[0.04] border border-white/5 rounded-lg px-4 py-3">
                <div className="flex items-center gap-2 text-surface-400 text-sm">
                  <span className="inline-block w-1.5 h-1.5 bg-primary-400 rounded-full animate-pulse" />
                  <span className="inline-block w-1.5 h-1.5 bg-primary-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
                  <span className="inline-block w-1.5 h-1.5 bg-primary-400 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }} />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div className="px-5 py-3 border-t border-white/10 shrink-0">
          <div className="flex gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={guideLoading ? 'Waiting for response...' : 'Ask about writing, your project, or how to use the app...'}
              disabled={guideLoading}
              rows={2}
              className="flex-1 bg-[#1a1a2e] text-surface-200 text-sm rounded-lg px-3 py-2 border border-white/10 focus:border-primary-500 focus:outline-none resize-none placeholder:text-surface-600 disabled:opacity-50"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || guideLoading}
              className="px-4 py-2 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors self-end"
            >
              Send
            </button>
          </div>
          <p className="text-[10px] text-surface-600 mt-1.5">
            Shift+Enter for new line. The guide has full context of your project.
          </p>
        </div>
      </div>
    </div>
  );
}

function MessageContent({ content }: { content: string }) {
  // Basic markdown rendering: bold, italic, code blocks, inline code, headers, lists
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeContent = '';
  let codeKey = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith('```')) {
      if (inCodeBlock) {
        elements.push(
          <pre key={`code-${codeKey++}`} className="bg-black/30 rounded p-2 text-xs overflow-x-auto my-1.5 text-surface-300">
            <code>{codeContent.trimEnd()}</code>
          </pre>
        );
        codeContent = '';
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeContent += line + '\n';
      continue;
    }

    if (line.startsWith('### ')) {
      elements.push(<div key={i} className="font-semibold text-surface-200 mt-2 mb-1">{formatInline(line.slice(4))}</div>);
    } else if (line.startsWith('## ')) {
      elements.push(<div key={i} className="font-semibold text-surface-100 mt-2 mb-1">{formatInline(line.slice(3))}</div>);
    } else if (line.startsWith('# ')) {
      elements.push(<div key={i} className="font-bold text-surface-100 mt-2 mb-1">{formatInline(line.slice(2))}</div>);
    } else if (line.match(/^[-*] /)) {
      elements.push(<div key={i} className="pl-3 before:content-['•'] before:mr-2 before:text-primary-400">{formatInline(line.slice(2))}</div>);
    } else if (line.match(/^\d+\. /)) {
      const numMatch = line.match(/^(\d+)\. (.*)/);
      if (numMatch) {
        elements.push(<div key={i} className="pl-3"><span className="text-primary-400 mr-2">{numMatch[1]}.</span>{formatInline(numMatch[2])}</div>);
      }
    } else if (line.trim() === '') {
      elements.push(<div key={i} className="h-2" />);
    } else {
      elements.push(<div key={i}>{formatInline(line)}</div>);
    }
  }

  return <div className="space-y-0.5">{elements}</div>;
}

function formatInline(text: string): React.ReactNode {
  // Process bold, italic, inline code
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    // Inline code
    const codeMatch = remaining.match(/^(.*?)`([^`]+)`(.*)/s);
    if (codeMatch) {
      if (codeMatch[1]) parts.push(<span key={key++}>{codeMatch[1]}</span>);
      parts.push(<code key={key++} className="bg-black/30 px-1 py-0.5 rounded text-xs text-primary-300">{codeMatch[2]}</code>);
      remaining = codeMatch[3];
      continue;
    }

    // Bold
    const boldMatch = remaining.match(/^(.*?)\*\*(.+?)\*\*(.*)/s);
    if (boldMatch) {
      if (boldMatch[1]) parts.push(<span key={key++}>{boldMatch[1]}</span>);
      parts.push(<strong key={key++} className="font-semibold text-surface-200">{boldMatch[2]}</strong>);
      remaining = boldMatch[3];
      continue;
    }

    // Italic
    const italicMatch = remaining.match(/^(.*?)\*(.+?)\*(.*)/s);
    if (italicMatch) {
      if (italicMatch[1]) parts.push(<span key={key++}>{italicMatch[1]}</span>);
      parts.push(<em key={key++} className="italic">{italicMatch[2]}</em>);
      remaining = italicMatch[3];
      continue;
    }

    parts.push(<span key={key++}>{remaining}</span>);
    break;
  }

  return parts.length === 1 ? parts[0] : <>{parts}</>;
}
