import React, { useState, useEffect } from 'react';
import { useWriterStore } from '../store/writerStore';
import type { ChapterOpenerConfig, FrontMatterConfig } from '../../shared/types';

export default function SettingsPanel() {
  const {
    settings,
    models,
    apiKeys,
    setShowSettings,
    saveSettings,
    setApiKey,
  } = useWriterStore();

  const [selectedModel, setSelectedModel] = useState(settings.selectedModel);
  const [theme, setTheme] = useState(settings.theme || 'dark');
  const [systemPrompt, setSystemPrompt] = useState(settings.systemPrompt);
  const [autoSaveInterval, setAutoSaveInterval] = useState(settings.autoSaveInterval);
  const [fontFamily, setFontFamily] = useState(settings.fontFamily || '');
  const [fontSize, setFontSize] = useState(settings.fontSize || 16);
  const [lineHeight, setLineHeight] = useState(settings.lineHeight || 1.8);
  const [paragraphSpacing, setParagraphSpacing] = useState(settings.paragraphSpacing ?? 0.75);
  const [paragraphIndent, setParagraphIndent] = useState(settings.paragraphIndent ?? 0);
  const [textAlignment, setTextAlignment] = useState(settings.textAlignment || 'left');
  const [headingFont, setHeadingFont] = useState(settings.headingFont || '');
  const [codeFont, setCodeFont] = useState(settings.codeFont || '');
  const [smallCaps, setSmallCaps] = useState(settings.smallCaps || false);
  const [letterSpacing, setLetterSpacing] = useState(settings.letterSpacing ?? 0);
  const [chapterOpener, setChapterOpener] = useState<ChapterOpenerConfig>(settings.chapterOpener || {
    titleSize: 'medium',
    lowerStart: 3,
    ornament: 'none',
    titleAlignment: 'center',
    subtitleVisible: false,
    pageBreak: true,
  });
  const [kerning, setKerning] = useState(settings.kerning ?? 0);
  const [ligatures, setLigatures] = useState(settings.ligatures ?? true);
  const [frontMatter, setFrontMatter] = useState<FrontMatterConfig>(settings.frontMatter || {
    titlePage: true,
    copyrightPage: false,
    dedicationPage: false,
    dedicationText: '',
    copyrightText: '',
    epigraphPage: false,
    epigraphText: '',
    epigraphAttribution: '',
  });
  const [fontPairings, setFontPairings] = useState<{ bodyFont: string; headingFont: string; codeFont: string; rationale: string }[]>([]);
  const [loadingPairings, setLoadingPairings] = useState(false);

  // API key inputs
  const [anthropicKey, setAnthropicKey] = useState('');
  const [openaiKey, setOpenaiKey] = useState('');
  const [googleKey, setGoogleKey] = useState('');
  const [xaiKey, setXaiKey] = useState('');
  const [babyaiKey, setBabyaiKey] = useState('');

  useEffect(() => {
    setAnthropicKey(apiKeys.anthropic || '');
    setOpenaiKey(apiKeys.openai || '');
    setGoogleKey(apiKeys.google || '');
    setXaiKey(apiKeys.xai || '');
    setBabyaiKey(apiKeys.babyai || '');
  }, [apiKeys]);

  const handleSave = async () => {
    await saveSettings({
      selectedModel,
      theme: theme as 'dark' | 'light' | 'sepia',
      systemPrompt,
      autoSaveInterval,
      fontFamily: fontFamily || undefined,
      fontSize: fontSize || undefined,
      lineHeight: lineHeight || undefined,
      paragraphSpacing,
      paragraphIndent,
      textAlignment: textAlignment as any,
      headingFont: headingFont || undefined,
      codeFont: codeFont || undefined,
      smallCaps: smallCaps || undefined,
      letterSpacing: letterSpacing || undefined,
      chapterOpener,
      kerning: kerning || undefined,
      ligatures,
      frontMatter,
    });

    // Save API keys
    if (anthropicKey !== (apiKeys.anthropic || '')) await setApiKey('anthropic', anthropicKey);
    if (openaiKey !== (apiKeys.openai || '')) await setApiKey('openai', openaiKey);
    if (googleKey !== (apiKeys.google || '')) await setApiKey('google', googleKey);
    if (xaiKey !== (apiKeys.xai || '')) await setApiKey('xai', xaiKey);
    if (babyaiKey !== (apiKeys.babyai || '')) await setApiKey('babyai', babyaiKey);

    setShowSettings(false);
  };

  // Group models by provider
  const providers = ['anthropic', 'openai', 'google', 'xai', 'babyai'];
  const providerNames: Record<string, string> = {
    anthropic: 'Anthropic',
    openai: 'OpenAI',
    google: 'Google',
    xai: 'xAI',
    babyai: 'BabyAI',
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-[var(--bg-panel)] rounded-lg border border-[var(--border)] w-[550px] max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-[var(--border)] flex items-center justify-between">
          <h2 className="text-sm font-semibold text-surface-200">Settings</h2>
          <button
            onClick={() => setShowSettings(false)}
            className="text-surface-500 hover:text-surface-300"
          >
            x
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Default Model */}
          <div>
            <label className="text-xs text-surface-500 block mb-2">Default AI Model</label>
            {providers.map((provider) => {
              const providerModels = models.filter((m) => m.provider === provider);
              if (providerModels.length === 0) return null;
              return (
                <div key={provider} className="mb-2">
                  <span className="text-xs text-surface-600 block mb-1">{providerNames[provider]}</span>
                  <div className="flex flex-wrap gap-1">
                    {providerModels.map((m) => (
                      <button
                        key={m.id}
                        onClick={() => setSelectedModel(m.id)}
                        className={`px-2 py-1 text-xs rounded transition-colors ${
                          selectedModel === m.id
                            ? 'bg-primary-600/30 text-primary-300 border border-primary-500'
                            : 'bg-[var(--bg-page)] text-surface-400 border border-[var(--border)] hover:border-surface-600'
                        }`}
                      >
                        {m.name}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* API Keys */}
          <div>
            <label className="text-xs text-surface-500 block mb-2">API Keys</label>
            <div className="space-y-2">
              {[
                { label: 'Anthropic', value: anthropicKey, set: setAnthropicKey },
                { label: 'OpenAI', value: openaiKey, set: setOpenaiKey },
                { label: 'Google', value: googleKey, set: setGoogleKey },
                { label: 'xAI', value: xaiKey, set: setXaiKey },
                { label: 'BabyAI', value: babyaiKey, set: setBabyaiKey },
              ].map(({ label, value, set }) => (
                <div key={label} className="flex items-center gap-2">
                  <span className="text-xs text-surface-400 w-20 shrink-0">{label}</span>
                  <input
                    type="password"
                    className="flex-1 bg-[var(--bg-page)] text-surface-200 rounded px-2 py-1.5 text-xs border border-[var(--border)] focus:border-primary-500 focus:outline-none"
                    placeholder={`${label} API key`}
                    value={value}
                    onChange={(e) => set(e.target.value)}
                  />
                  {value && (
                    <span className="text-green-400 text-xs shrink-0">Set</span>
                  )}
                </div>
              ))}
              <p className="text-xs text-surface-600 mt-1">
                API keys are shared across all NovaSyn apps.
              </p>
            </div>
          </div>

          {/* System Prompt */}
          <div>
            <label className="text-xs text-surface-500 block mb-1">Custom System Prompt</label>
            <textarea
              className="w-full bg-[var(--bg-page)] text-surface-200 rounded px-3 py-2 text-xs border border-[var(--border)] focus:border-primary-500 focus:outline-none resize-none h-20"
              placeholder="Optional instructions for the AI writing assistant..."
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
            />
          </div>

          {/* Theme */}
          <div>
            <label className="text-xs text-surface-500 block mb-2">Theme</label>
            <div className="flex gap-2">
              {([
                { id: 'dark', label: 'Dark', preview: 'bg-[#1a1a2e]', text: 'text-[#e9ecef]' },
                { id: 'light', label: 'Light', preview: 'bg-[#f5f5f5]', text: 'text-[#1a1a1a]' },
                { id: 'sepia', label: 'Sepia', preview: 'bg-[#f4ecd8]', text: 'text-[#3b3121]' },
              ] as const).map(t => (
                <button
                  key={t.id}
                  onClick={() => {
                    setTheme(t.id);
                    // Live preview
                    document.documentElement.setAttribute('data-theme', t.id);
                  }}
                  className={`flex-1 py-2 text-xs rounded transition-colors flex items-center justify-center gap-2 ${
                    theme === t.id
                      ? 'ring-2 ring-primary-500 border border-primary-500'
                      : 'border border-[var(--border)]'
                  }`}
                >
                  <span className={`w-4 h-4 rounded-sm ${t.preview} border border-[var(--border)]`} />
                  <span className="text-surface-300">{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Typography */}
          <div>
            <label className="text-xs text-surface-500 block mb-2">Typography</label>
            <div className="space-y-3 p-3 bg-[var(--bg-page)] rounded border border-[var(--border)]">
              {/* Font Family */}
              <div>
                <label className="text-xs text-surface-400 block mb-1">Font Family</label>
                <select
                  value={fontFamily}
                  onChange={(e) => setFontFamily(e.target.value)}
                  className="w-full bg-[var(--bg-panel)] text-surface-200 rounded px-2 py-1.5 text-xs border border-[var(--border)] focus:border-primary-500 focus:outline-none"
                >
                  <option value="">System Default</option>
                  <option value="Georgia, 'Times New Roman', serif">Georgia (Serif)</option>
                  <option value="'Times New Roman', Times, serif">Times New Roman</option>
                  <option value="'Palatino Linotype', Palatino, serif">Palatino</option>
                  <option value="'Libre Baskerville', Baskerville, serif">Baskerville</option>
                  <option value="-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif">System Sans</option>
                  <option value="'Courier New', Courier, monospace">Courier New</option>
                  <option value="'Fira Code', Consolas, monospace">Fira Code (Mono)</option>
                </select>
              </div>

              {/* Font Size */}
              <div>
                <label className="text-xs text-surface-400 block mb-1">
                  Font Size: {fontSize}px
                </label>
                <input
                  type="range"
                  min="12"
                  max="24"
                  step="1"
                  className="w-full"
                  value={fontSize}
                  onChange={(e) => setFontSize(Number(e.target.value))}
                />
                <div className="flex justify-between text-xs text-surface-600">
                  <span>12px</span>
                  <span>24px</span>
                </div>
              </div>

              {/* Line Height */}
              <div>
                <label className="text-xs text-surface-400 block mb-1">
                  Line Height: {lineHeight.toFixed(1)}
                </label>
                <input
                  type="range"
                  min="1.0"
                  max="3.0"
                  step="0.1"
                  className="w-full"
                  value={lineHeight}
                  onChange={(e) => setLineHeight(Number(e.target.value))}
                />
                <div className="flex justify-between text-xs text-surface-600">
                  <span>1.0</span>
                  <span>3.0</span>
                </div>
              </div>

              {/* Paragraph Spacing */}
              <div>
                <label className="text-xs text-surface-400 block mb-1">
                  Paragraph Spacing: {paragraphSpacing.toFixed(2)}em
                </label>
                <input
                  type="range"
                  min="0"
                  max="3"
                  step="0.25"
                  className="w-full"
                  value={paragraphSpacing}
                  onChange={(e) => setParagraphSpacing(Number(e.target.value))}
                />
                <div className="flex justify-between text-xs text-surface-600">
                  <span>0</span>
                  <span>3em</span>
                </div>
              </div>

              {/* Paragraph Indent */}
              <div>
                <label className="text-xs text-surface-400 block mb-1">
                  First-Line Indent: {paragraphIndent.toFixed(1)}em
                </label>
                <input
                  type="range"
                  min="0"
                  max="3"
                  step="0.5"
                  className="w-full"
                  value={paragraphIndent}
                  onChange={(e) => setParagraphIndent(Number(e.target.value))}
                />
                <div className="flex justify-between text-xs text-surface-600">
                  <span>0</span>
                  <span>3em</span>
                </div>
              </div>

              {/* Text Alignment */}
              <div>
                <label className="text-xs text-surface-400 block mb-1">Text Alignment</label>
                <div className="flex gap-1">
                  {(['left', 'center', 'right', 'justify'] as const).map(align => (
                    <button
                      key={align}
                      onClick={() => setTextAlignment(align)}
                      className={`flex-1 px-2 py-1 text-xs rounded transition-colors capitalize ${
                        textAlignment === align
                          ? 'bg-primary-600/30 text-primary-300 border border-primary-500'
                          : 'bg-[var(--bg-page)] text-surface-400 border border-[var(--border)] hover:border-surface-600'
                      }`}
                    >
                      {align}
                    </button>
                  ))}
                </div>
              </div>

              {/* Heading Font */}
              <div>
                <label className="text-xs text-surface-400 block mb-1">Heading Font</label>
                <select
                  value={headingFont}
                  onChange={(e) => setHeadingFont(e.target.value)}
                  className="w-full bg-[var(--bg-panel)] text-surface-200 rounded px-2 py-1.5 text-xs border border-[var(--border)] focus:border-primary-500 focus:outline-none"
                >
                  <option value="">Same as body</option>
                  <option value="Georgia, 'Times New Roman', serif">Georgia (Serif)</option>
                  <option value="'Times New Roman', Times, serif">Times New Roman</option>
                  <option value="'Palatino Linotype', Palatino, serif">Palatino</option>
                  <option value="'Libre Baskerville', Baskerville, serif">Baskerville</option>
                  <option value="-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif">System Sans</option>
                  <option value="'Courier New', Courier, monospace">Courier New</option>
                </select>
              </div>

              {/* Code Font */}
              <div>
                <label className="text-xs text-surface-400 block mb-1">Code Font</label>
                <select
                  value={codeFont}
                  onChange={(e) => setCodeFont(e.target.value)}
                  className="w-full bg-[var(--bg-panel)] text-surface-200 rounded px-2 py-1.5 text-xs border border-[var(--border)] focus:border-primary-500 focus:outline-none"
                >
                  <option value="">Default (Fira Code)</option>
                  <option value="'Fira Code', Consolas, monospace">Fira Code</option>
                  <option value="Consolas, 'Courier New', monospace">Consolas</option>
                  <option value="'Courier New', Courier, monospace">Courier New</option>
                  <option value="Monaco, Menlo, monospace">Monaco</option>
                </select>
              </div>

              {/* Small Caps & Letter Spacing row */}
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-xs text-surface-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={smallCaps}
                    onChange={(e) => setSmallCaps(e.target.checked)}
                    className="rounded"
                  />
                  Small Caps
                </label>
                <div className="flex-1">
                  <label className="text-xs text-surface-400 block mb-1">
                    Letter Spacing: {letterSpacing.toFixed(2)}em
                  </label>
                  <input
                    type="range"
                    min="-0.05"
                    max="0.2"
                    step="0.01"
                    className="w-full"
                    value={letterSpacing}
                    onChange={(e) => setLetterSpacing(Number(e.target.value))}
                  />
                </div>
              </div>

              {/* Kerning & Ligatures */}
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <label className="text-xs text-surface-400 block mb-1">
                    Kerning: {kerning.toFixed(2)}em
                  </label>
                  <input
                    type="range"
                    min="-0.05"
                    max="0.1"
                    step="0.01"
                    className="w-full"
                    value={kerning}
                    onChange={(e) => setKerning(Number(e.target.value))}
                  />
                </div>
                <label className="flex items-center gap-2 text-xs text-surface-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={ligatures}
                    onChange={(e) => setLigatures(e.target.checked)}
                    className="rounded"
                  />
                  Ligatures
                </label>
              </div>

              {/* AI Font Pairings */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs text-surface-400">AI Font Pairings</label>
                  <button
                    onClick={async () => {
                      setLoadingPairings(true);
                      try {
                        const results = await window.electronAPI.suggestFontPairings('fiction', 'literary');
                        setFontPairings(results);
                      } catch { setFontPairings([]); }
                      setLoadingPairings(false);
                    }}
                    disabled={loadingPairings}
                    className="px-2 py-0.5 text-[10px] bg-primary-600/20 text-primary-300 rounded hover:bg-primary-600/30 disabled:opacity-50"
                  >
                    {loadingPairings ? 'Analyzing...' : 'Suggest Pairings'}
                  </button>
                </div>
                {fontPairings.length > 0 && (
                  <div className="space-y-2">
                    {fontPairings.map((p, i) => (
                      <div key={i} className="p-2 bg-[var(--bg-panel)] rounded border border-[var(--border)]">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] text-surface-500">Pairing {i + 1}</span>
                          <button
                            onClick={() => {
                              setFontFamily(p.bodyFont);
                              setHeadingFont(p.headingFont);
                              setCodeFont(p.codeFont);
                            }}
                            className="px-2 py-0.5 text-[10px] bg-green-600/20 text-green-300 rounded hover:bg-green-600/30"
                          >
                            Apply
                          </button>
                        </div>
                        <div className="text-[10px] text-surface-300 space-y-0.5">
                          <div>Body: <span className="text-surface-200">{p.bodyFont}</span></div>
                          <div>Heading: <span className="text-surface-200">{p.headingFont}</span></div>
                          <div>Code: <span className="text-surface-200">{p.codeFont}</span></div>
                          <div className="text-surface-500 italic mt-1">{p.rationale}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Cover Image */}
              <div>
                <label className="text-xs text-surface-400 block mb-1">Cover Image (for EPUB/Kindle export)</label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={async () => {
                      const result = await window.electronAPI.selectCoverImage();
                      if (result) {
                        saveSettings({ coverImagePath: result.filePath });
                      }
                    }}
                    className="px-3 py-1 text-xs bg-[var(--bg-page)] text-surface-300 border border-[var(--border)] rounded hover:border-surface-600"
                  >
                    {settings.coverImagePath ? 'Change Cover' : 'Select Cover'}
                  </button>
                  {settings.coverImagePath && (
                    <>
                      <span className="text-[10px] text-surface-500 truncate flex-1">{settings.coverImagePath.split(/[\\/]/).pop()}</span>
                      <button
                        onClick={() => saveSettings({ coverImagePath: undefined })}
                        className="text-red-400 hover:text-red-300 text-xs"
                      >
                        Clear
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Chapter Opener */}
          <div>
            <label className="text-xs text-surface-500 block mb-2">Chapter Opener</label>
            <div className="space-y-3 p-3 bg-[var(--bg-page)] rounded border border-[var(--border)]">
              {/* Title Size */}
              <div>
                <label className="text-xs text-surface-400 block mb-1">Title Size</label>
                <div className="flex gap-1">
                  {(['small', 'medium', 'large', 'xlarge'] as const).map(s => (
                    <button
                      key={s}
                      onClick={() => setChapterOpener({ ...chapterOpener, titleSize: s })}
                      className={`flex-1 px-2 py-1 text-xs rounded transition-colors capitalize ${
                        chapterOpener.titleSize === s
                          ? 'bg-primary-600/30 text-primary-300 border border-primary-500'
                          : 'bg-[var(--bg-panel)] text-surface-400 border border-[var(--border)] hover:border-surface-600'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Title Alignment */}
              <div>
                <label className="text-xs text-surface-400 block mb-1">Title Alignment</label>
                <div className="flex gap-1">
                  {(['left', 'center', 'right'] as const).map(a => (
                    <button
                      key={a}
                      onClick={() => setChapterOpener({ ...chapterOpener, titleAlignment: a })}
                      className={`flex-1 px-2 py-1 text-xs rounded transition-colors capitalize ${
                        chapterOpener.titleAlignment === a
                          ? 'bg-primary-600/30 text-primary-300 border border-primary-500'
                          : 'bg-[var(--bg-panel)] text-surface-400 border border-[var(--border)] hover:border-surface-600'
                      }`}
                    >
                      {a}
                    </button>
                  ))}
                </div>
              </div>

              {/* Lower Start */}
              <div>
                <label className="text-xs text-surface-400 block mb-1">
                  Lower Start: {chapterOpener.lowerStart}em
                </label>
                <input
                  type="range"
                  min="0"
                  max="8"
                  step="1"
                  className="w-full"
                  value={chapterOpener.lowerStart}
                  onChange={(e) => setChapterOpener({ ...chapterOpener, lowerStart: Number(e.target.value) })}
                />
                <div className="flex justify-between text-xs text-surface-600">
                  <span>0</span>
                  <span>8em</span>
                </div>
              </div>

              {/* Ornament */}
              <div>
                <label className="text-xs text-surface-400 block mb-1">Ornamental Divider</label>
                <div className="flex gap-1 flex-wrap">
                  {([
                    { id: 'none', label: 'None' },
                    { id: 'line', label: '———' },
                    { id: 'dots', label: '• • •' },
                    { id: 'fleuron', label: '❧' },
                    { id: 'diamond', label: '◆' },
                    { id: 'stars', label: '✦ ✦ ✦' },
                  ] as const).map(o => (
                    <button
                      key={o.id}
                      onClick={() => setChapterOpener({ ...chapterOpener, ornament: o.id })}
                      className={`px-2 py-1 text-xs rounded transition-colors ${
                        chapterOpener.ornament === o.id
                          ? 'bg-primary-600/30 text-primary-300 border border-primary-500'
                          : 'bg-[var(--bg-panel)] text-surface-400 border border-[var(--border)] hover:border-surface-600'
                      }`}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Toggles */}
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-xs text-surface-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={chapterOpener.subtitleVisible}
                    onChange={(e) => setChapterOpener({ ...chapterOpener, subtitleVisible: e.target.checked })}
                    className="rounded"
                  />
                  Show "Chapter" label
                </label>
                <label className="flex items-center gap-2 text-xs text-surface-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={chapterOpener.pageBreak}
                    onChange={(e) => setChapterOpener({ ...chapterOpener, pageBreak: e.target.checked })}
                    className="rounded"
                  />
                  Page break before
                </label>
              </div>
            </div>
          </div>

          {/* Front Matter */}
          <div>
            <label className="text-xs text-surface-500 block mb-2">Front Matter</label>
            <div className="space-y-3 p-3 bg-[var(--bg-page)] rounded border border-[var(--border)]">
              {/* Page toggles */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-xs text-surface-400 cursor-pointer">
                  <input type="checkbox" checked={frontMatter.titlePage} onChange={e => setFrontMatter({ ...frontMatter, titlePage: e.target.checked })} className="rounded" />
                  Title Page
                </label>
                <label className="flex items-center gap-2 text-xs text-surface-400 cursor-pointer">
                  <input type="checkbox" checked={frontMatter.copyrightPage} onChange={e => setFrontMatter({ ...frontMatter, copyrightPage: e.target.checked })} className="rounded" />
                  Copyright Page
                </label>
                {frontMatter.copyrightPage && (
                  <textarea
                    value={frontMatter.copyrightText}
                    onChange={e => setFrontMatter({ ...frontMatter, copyrightText: e.target.value })}
                    placeholder="Copyright notice (auto-generated if blank)"
                    className="w-full bg-[var(--bg-panel)] text-surface-200 rounded px-2 py-1 text-xs border border-[var(--border)] focus:border-primary-500 focus:outline-none resize-none h-12 ml-6"
                  />
                )}
                <label className="flex items-center gap-2 text-xs text-surface-400 cursor-pointer">
                  <input type="checkbox" checked={frontMatter.dedicationPage} onChange={e => setFrontMatter({ ...frontMatter, dedicationPage: e.target.checked })} className="rounded" />
                  Dedication Page
                </label>
                {frontMatter.dedicationPage && (
                  <textarea
                    value={frontMatter.dedicationText}
                    onChange={e => setFrontMatter({ ...frontMatter, dedicationText: e.target.value })}
                    placeholder="Dedication text..."
                    className="w-full bg-[var(--bg-panel)] text-surface-200 rounded px-2 py-1 text-xs border border-[var(--border)] focus:border-primary-500 focus:outline-none resize-none h-12 ml-6"
                  />
                )}
                <label className="flex items-center gap-2 text-xs text-surface-400 cursor-pointer">
                  <input type="checkbox" checked={frontMatter.epigraphPage} onChange={e => setFrontMatter({ ...frontMatter, epigraphPage: e.target.checked })} className="rounded" />
                  Epigraph Page
                </label>
                {frontMatter.epigraphPage && (
                  <div className="ml-6 space-y-1">
                    <textarea
                      value={frontMatter.epigraphText}
                      onChange={e => setFrontMatter({ ...frontMatter, epigraphText: e.target.value })}
                      placeholder="Epigraph quote..."
                      className="w-full bg-[var(--bg-panel)] text-surface-200 rounded px-2 py-1 text-xs border border-[var(--border)] focus:border-primary-500 focus:outline-none resize-none h-12"
                    />
                    <input
                      value={frontMatter.epigraphAttribution}
                      onChange={e => setFrontMatter({ ...frontMatter, epigraphAttribution: e.target.value })}
                      placeholder="— Attribution"
                      className="w-full bg-[var(--bg-panel)] text-surface-200 rounded px-2 py-1 text-xs border border-[var(--border)] focus:border-primary-500 focus:outline-none"
                    />
                  </div>
                )}
              </div>
              <p className="text-[10px] text-surface-500">Front matter pages appear before chapter content in PDF, EPUB, and Kindle exports.</p>
            </div>
          </div>

          {/* Columns */}
          <div>
            <label className="text-xs text-surface-500 block mb-2">Multi-Column Layout</label>
            <div className="flex gap-2">
              {([1, 2, 3] as const).map(c => (
                <button
                  key={c}
                  onClick={() => saveSettings({ columns: c === 1 ? undefined : c })}
                  className={`flex-1 py-2 text-xs rounded transition-colors ${
                    (settings.columns || 1) === c
                      ? 'bg-primary-600/30 text-primary-300 border border-primary-500'
                      : 'bg-[var(--bg-page)] text-surface-400 border border-[var(--border)]'
                  }`}
                >
                  {c} Column{c > 1 ? 's' : ''}
                </button>
              ))}
            </div>
          </div>

          {/* Auto-Update */}
          <div>
            <label className="flex items-center gap-2 text-xs text-surface-400 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.autoCheckUpdates ?? true}
                onChange={e => saveSettings({ autoCheckUpdates: e.target.checked })}
                className="rounded"
              />
              Automatically check for updates on launch
            </label>
          </div>

          {/* Auto-save interval */}
          <div>
            <label className="text-xs text-surface-500 block mb-1">
              Auto-save Interval: {autoSaveInterval / 1000}s
            </label>
            <input
              type="range"
              min="500"
              max="10000"
              step="500"
              className="w-full"
              value={autoSaveInterval}
              onChange={(e) => setAutoSaveInterval(Number(e.target.value))}
            />
            <div className="flex justify-between text-xs text-surface-600">
              <span>0.5s</span>
              <span>10s</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[var(--border)] flex justify-end gap-2">
          <button
            onClick={() => setShowSettings(false)}
            className="px-3 py-1.5 text-xs text-surface-400 hover:text-surface-200 rounded transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-1.5 text-xs bg-primary-600 hover:bg-primary-500 text-white rounded transition-colors"
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
}
