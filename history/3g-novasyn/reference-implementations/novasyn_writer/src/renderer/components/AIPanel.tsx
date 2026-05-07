import React, { useState } from 'react';
import { useWriterStore } from '../store/writerStore';

const TONE_OPTIONS = ['darker', 'lighter', 'tense', 'reflective', 'urgent', 'dreamlike'] as const;

const AI_TOOLS = [
  { id: 'continue', label: 'Continue', prompt: 'Continue writing from where the text left off. Maintain the same style, tone, and voice. Write 2-3 paragraphs.' },
  { id: 'expand', label: 'Expand', prompt: 'Expand on the following text with more detail, description, and depth. Keep the same style and voice.' },
  { id: 'rewrite', label: 'Rewrite', prompt: 'Rewrite the following text to improve clarity, flow, and engagement while preserving the original meaning and voice.' },
  { id: 'brainstorm', label: 'Brainstorm', prompt: 'Help me brainstorm ideas for what could happen next in this story. Provide 3-5 creative suggestions with brief descriptions.' },
  { id: 'dialogue', label: 'Dialogue Polish', prompt: 'Rewrite this dialogue to sound more natural and distinctive. Each character should have a unique voice. Preserve the information exchanged but make it feel like real people talking.' },
  { id: 'show', label: 'Show Don\'t Tell', prompt: 'Rewrite this passage using "show don\'t tell" technique. Replace abstract statements with concrete sensory details, actions, and dialogue that let the reader experience the scene rather than being told about it.' },
  { id: 'compress', label: 'Compress', prompt: 'Tighten this passage by removing unnecessary words, redundancies, and filler while preserving the meaning, voice, and important details. Make every word count.' },
  { id: 'tone', label: 'Tone Shift', prompt: '' }, // prompt built dynamically
  { id: 'summarize', label: 'Summarize', prompt: 'Provide a concise summary of the following text, capturing the key events, character developments, and important details in 2-3 paragraphs.' },
  { id: 'scene', label: 'Scene from Beat', prompt: 'Write a full, vivid scene based on the following outline beat. Include sensory details, dialogue where appropriate, and emotional depth. Match the tone and style of the existing chapter content.' },
  { id: 'voice', label: 'Voice Match', prompt: '' }, // prompt built dynamically
  { id: 'dialogueGen', label: 'Dialogue Gen', prompt: '' }, // prompt built dynamically
  { id: 'custom', label: 'Custom', prompt: '' },
];

export default function AIPanel() {
  const {
    aiResponse,
    aiStreaming,
    settings,
    models,
    apiKeys,
    encyclopediaEntries,
    kbEntries,
    sendAiPrompt,
    acceptAiResult,
    discardAiResult,
    toggleAiPanel,
  } = useWriterStore();

  const [selectedTool, setSelectedTool] = useState('continue');
  const [customPrompt, setCustomPrompt] = useState('');
  const [selectedModel, setSelectedModel] = useState(settings.selectedModel);
  const [selectedEntryIds, setSelectedEntryIds] = useState<string[]>([]);
  const [selectedTone, setSelectedTone] = useState<string>('darker');
  const [voiceSample, setVoiceSample] = useState('');
  const [dialogueCharA, setDialogueCharA] = useState('');
  const [dialogueCharB, setDialogueCharB] = useState('');
  const [dialogueScene, setDialogueScene] = useState('');
  const [selectedKbIds, setSelectedKbIds] = useState<string[]>([]);

  const availableModels = models.filter((m) => apiKeys[m.provider]);

  const handleGenerate = async () => {
    const tool = AI_TOOLS.find((t) => t.id === selectedTool);
    if (!tool) return;

    let prompt: string;
    if (selectedTool === 'custom') {
      prompt = customPrompt;
    } else if (selectedTool === 'tone') {
      prompt = `Rewrite this passage to shift the emotional tone to "${selectedTone}". Maintain the core meaning and plot points but transform the atmosphere, word choice, and rhythm to feel distinctly ${selectedTone}.`;
    } else if (selectedTool === 'voice') {
      if (!voiceSample.trim()) return;
      prompt = `Analyze the following writing sample and rewrite the selected text to match its voice, style, rhythm, and word choices.\n\nWriting sample to match:\n${voiceSample}`;
    } else if (selectedTool === 'dialogueGen') {
      const charA = encyclopediaEntries.find((e) => e.id === dialogueCharA);
      const charB = encyclopediaEntries.find((e) => e.id === dialogueCharB);
      if (!charA || !charB || !dialogueScene.trim()) return;
      // Auto-include both character entries as context
      const charIds = [dialogueCharA, dialogueCharB].filter((id) => !selectedEntryIds.includes(id));
      charIds.forEach((id) => setSelectedEntryIds((prev) => [...prev, id]));
      prompt = `Generate a dialogue scene between the following two characters. Write natural, distinctive dialogue that reflects each character's personality and voice.\n\nCharacter A:\n[${charA.category}: ${charA.name}]\n${charA.content}\n\nCharacter B:\n[${charB.category}: ${charB.name}]\n${charB.content}\n\nScene:\n${dialogueScene}`;
    } else {
      prompt = tool.prompt;
    }
    if (!prompt.trim()) return;

    // Get selected text from editor if available
    const editor = (window as any).__tiptapEditor;
    let fullPrompt = prompt;
    if (editor) {
      const { from, to } = editor.state.selection;
      if (from !== to) {
        const selectedText = editor.state.doc.textBetween(from, to);
        fullPrompt = `${prompt}\n\nSelected text:\n${selectedText}`;
      }
    }

    // Combine encyclopedia IDs with KB context strings
    const kbContextEntries = kbEntries
      .filter((e) => selectedKbIds.includes(e.id))
      .map((e) => `[KB: ${e.category} - ${e.title}]\n${e.content}`);
    // Build combined entry IDs — encyclopedia IDs for lookup + inject KB as extra context
    const allSelectedIds = [...selectedEntryIds];
    // We pass KB content through the encyclopedia context mechanism
    // by temporarily injecting into the prompt if KB entries are selected
    let kbPrompt = fullPrompt;
    if (kbContextEntries.length > 0) {
      kbPrompt = fullPrompt + '\n\n=== KNOWLEDGE BASE CONTEXT ===\n\n' + kbContextEntries.join('\n\n---\n\n');
    }

    await sendAiPrompt(kbPrompt, selectedModel, allSelectedIds, selectedTool);
  };

  const handleAccept = () => {
    const editor = (window as any).__tiptapEditor;
    if (!editor || !aiResponse) return;

    // Insert at cursor position
    editor.chain().focus().insertContent(aiResponse).run();
    acceptAiResult();
  };

  const handleCancel = () => {
    window.electronAPI.cancelStream();
  };

  const toggleEntry = (id: string) => {
    setSelectedEntryIds((prev) =>
      prev.includes(id) ? prev.filter((e) => e !== id) : [...prev, id],
    );
  };

  const toggleKbEntry = (id: string) => {
    setSelectedKbIds((prev) =>
      prev.includes(id) ? prev.filter((e) => e !== id) : [...prev, id],
    );
  };

  return (
    <div className="w-80 bg-[var(--bg-panel)] border-l border-[var(--border)] flex flex-col shrink-0">
      {/* Header */}
      <div className="h-10 flex items-center justify-between px-3 border-b border-[var(--border)] shrink-0">
        <span className="text-sm font-semibold text-surface-300">AI Assistant</span>
        <button
          onClick={toggleAiPanel}
          className="text-surface-500 hover:text-surface-300 text-xs"
        >
          Close
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {/* Model selector */}
        <div>
          <label className="text-xs text-surface-500 block mb-1">Model</label>
          <select
            className="w-full bg-[var(--bg-page)] text-surface-200 rounded px-2 py-1.5 text-xs border border-[var(--border)] focus:border-primary-500 focus:outline-none"
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
          >
            {availableModels.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>

        {/* AI Tool selector */}
        <div>
          <label className="text-xs text-surface-500 block mb-1">Writing Tool</label>
          <div className="flex flex-wrap gap-1">
            {AI_TOOLS.map((tool) => (
              <button
                key={tool.id}
                onClick={() => setSelectedTool(tool.id)}
                className={`px-2 py-1 text-xs rounded transition-colors ${
                  selectedTool === tool.id
                    ? 'bg-primary-600/30 text-primary-300'
                    : 'bg-[var(--bg-page)] text-surface-400 hover:text-surface-200'
                }`}
              >
                {tool.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tone sub-selector */}
        {selectedTool === 'tone' && (
          <div>
            <label className="text-xs text-surface-500 block mb-1">Target Tone</label>
            <div className="flex flex-wrap gap-1">
              {TONE_OPTIONS.map((tone) => (
                <button
                  key={tone}
                  onClick={() => setSelectedTone(tone)}
                  className={`px-2 py-1 text-xs rounded capitalize transition-colors ${
                    selectedTone === tone
                      ? 'bg-accent-500/30 text-accent-300'
                      : 'bg-[var(--bg-page)] text-surface-400 hover:text-surface-200'
                  }`}
                >
                  {tone}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Voice Match input */}
        {selectedTool === 'voice' && (
          <div>
            <label className="text-xs text-surface-500 block mb-1">Writing sample to match</label>
            <textarea
              className="w-full bg-[var(--bg-page)] text-surface-200 rounded px-2 py-1.5 text-xs border border-[var(--border)] focus:border-primary-500 focus:outline-none resize-none h-24"
              placeholder="Paste a writing sample whose voice, style, and rhythm you want to match..."
              value={voiceSample}
              onChange={(e) => setVoiceSample(e.target.value)}
            />
          </div>
        )}

        {/* Dialogue Generator inputs */}
        {selectedTool === 'dialogueGen' && (
          <div className="space-y-2">
            <div>
              <label className="text-xs text-surface-500 block mb-1">Character A</label>
              <select
                className="w-full bg-[var(--bg-page)] text-surface-200 rounded px-2 py-1.5 text-xs border border-[var(--border)] focus:border-primary-500 focus:outline-none"
                value={dialogueCharA}
                onChange={(e) => setDialogueCharA(e.target.value)}
              >
                <option value="">Select character...</option>
                {encyclopediaEntries
                  .filter((e) => e.category === 'Character')
                  .map((e) => (
                    <option key={e.id} value={e.id}>{e.name}</option>
                  ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-surface-500 block mb-1">Character B</label>
              <select
                className="w-full bg-[var(--bg-page)] text-surface-200 rounded px-2 py-1.5 text-xs border border-[var(--border)] focus:border-primary-500 focus:outline-none"
                value={dialogueCharB}
                onChange={(e) => setDialogueCharB(e.target.value)}
              >
                <option value="">Select character...</option>
                {encyclopediaEntries
                  .filter((e) => e.category === 'Character')
                  .map((e) => (
                    <option key={e.id} value={e.id}>{e.name}</option>
                  ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-surface-500 block mb-1">Scene description</label>
              <textarea
                className="w-full bg-[var(--bg-page)] text-surface-200 rounded px-2 py-1.5 text-xs border border-[var(--border)] focus:border-primary-500 focus:outline-none resize-none h-16"
                placeholder="Describe the scene context..."
                value={dialogueScene}
                onChange={(e) => setDialogueScene(e.target.value)}
              />
            </div>
          </div>
        )}

        {/* Custom prompt input */}
        {selectedTool === 'custom' && (
          <div>
            <textarea
              className="w-full bg-[var(--bg-page)] text-surface-200 rounded px-2 py-1.5 text-xs border border-[var(--border)] focus:border-primary-500 focus:outline-none resize-none h-20"
              placeholder="Enter your prompt..."
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
            />
          </div>
        )}

        {/* Context: Encyclopedia entries */}
        {encyclopediaEntries.length > 0 && (
          <div>
            <label className="text-xs text-surface-500 block mb-1">Include Context</label>
            <div className="max-h-32 overflow-y-auto space-y-0.5">
              {encyclopediaEntries.map((entry) => (
                <label
                  key={entry.id}
                  className="flex items-center gap-2 px-2 py-1 text-xs text-surface-400 hover:bg-white/5 rounded cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedEntryIds.includes(entry.id)}
                    onChange={() => toggleEntry(entry.id)}
                    className="rounded"
                  />
                  <span className="truncate">{entry.name}</span>
                  <span className="text-surface-600 shrink-0 ml-auto">{entry.tokens}t</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Context: Knowledge Base entries */}
        {kbEntries.length > 0 && (
          <div>
            <label className="text-xs text-surface-500 block mb-1">Knowledge Base</label>
            <div className="max-h-32 overflow-y-auto space-y-0.5">
              {kbEntries.map((entry) => (
                <label
                  key={entry.id}
                  className="flex items-center gap-2 px-2 py-1 text-xs text-surface-400 hover:bg-white/5 rounded cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedKbIds.includes(entry.id)}
                    onChange={() => toggleKbEntry(entry.id)}
                    className="rounded"
                  />
                  <span className="truncate">{entry.title}</span>
                  <span className="text-surface-600 shrink-0 ml-auto">{entry.tokens}t</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Generate / Cancel button */}
        {aiStreaming ? (
          <button
            onClick={handleCancel}
            className="w-full py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 text-sm rounded transition-colors"
          >
            Cancel
          </button>
        ) : (
          <button
            onClick={handleGenerate}
            disabled={
              (selectedTool === 'custom' && !customPrompt.trim()) ||
              (selectedTool === 'voice' && !voiceSample.trim()) ||
              (selectedTool === 'dialogueGen' && (!dialogueCharA || !dialogueCharB || !dialogueScene.trim()))
            }
            className="w-full py-2 bg-primary-600 hover:bg-primary-500 disabled:bg-surface-700 disabled:text-surface-500 text-white text-sm rounded transition-colors"
          >
            Generate
          </button>
        )}

        {/* AI Response */}
        {aiResponse && (
          <div>
            <label className="text-xs text-surface-500 block mb-1">Response</label>
            <div className="bg-[var(--bg-page)] rounded border border-[var(--border)] p-3 max-h-64 overflow-y-auto">
              <div className="text-sm text-surface-200 whitespace-pre-wrap leading-relaxed">
                {aiResponse}
              </div>
            </div>
            {!aiStreaming && (
              <div className="flex gap-2 mt-2">
                <button
                  onClick={handleAccept}
                  className="flex-1 py-1.5 bg-green-600/20 text-green-400 hover:bg-green-600/30 text-xs rounded transition-colors"
                >
                  Accept & Insert
                </button>
                <button
                  onClick={discardAiResult}
                  className="flex-1 py-1.5 bg-red-600/10 text-red-400 hover:bg-red-600/20 text-xs rounded transition-colors"
                >
                  Discard
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
