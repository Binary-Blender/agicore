import React, { useState } from 'react';
import { useSocialStore } from '../store/socialStore';

const STEPS = [
  { title: 'Welcome', description: 'Set up NovaSyn Social' },
  { title: 'API Keys', description: 'Connect your AI providers' },
  { title: 'First Message', description: 'Try the inbox' },
];

const API_KEY_PROVIDERS = [
  { key: 'anthropic', label: 'Anthropic (Claude)', required: true },
  { key: 'openai', label: 'OpenAI (GPT + Embeddings)', required: false },
  { key: 'google', label: 'Google (Gemini)', required: false },
  { key: 'xai', label: 'xAI (Grok)', required: false },
];

const Onboarding: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const setApiKey = useSocialStore((s) => s.setApiKey);
  const saveSettings = useSocialStore((s) => s.saveSettings);
  const createMessage = useSocialStore((s) => s.createMessage);

  const [step, setStep] = useState(0);
  const [keys, setKeys] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const handleSaveKeys = async () => {
    setSaving(true);
    for (const [provider, key] of Object.entries(keys)) {
      if (key.trim()) {
        await setApiKey(provider, key.trim());
      }
    }
    setSaving(false);
    setStep(2);
  };

  const handleCreateSample = async () => {
    await createMessage({
      channelType: 'manual',
      senderName: 'Test User',
      senderHandle: '@testuser',
      subject: 'Welcome to NovaSyn Social',
      body: 'This is a sample message to help you explore the app. Try classifying it with AI, generating a draft response, and accepting or editing the draft to feed the SPC quality engine.',
      priorityScore: 75,
    });
    await saveSettings({ onboarding_complete: 'true' } as any);
    onComplete();
  };

  const handleSkip = async () => {
    await saveSettings({ onboarding_complete: 'true' } as any);
    onComplete();
  };

  return (
    <div className="h-full flex items-center justify-center bg-[var(--bg-page)]">
      <div className="w-full max-w-lg">
        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {STEPS.map((_, idx) => (
            <div
              key={idx}
              className={`w-2.5 h-2.5 rounded-full transition-colors ${
                idx === step ? 'bg-indigo-500' : idx < step ? 'bg-indigo-500/50' : 'bg-[var(--border)]'
              }`}
            />
          ))}
        </div>

        <div className="bg-[var(--bg-panel)] border border-[var(--border)] rounded-xl p-8">
          {/* Step 0: Welcome */}
          {step === 0 && (
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-6 bg-indigo-600/20 rounded-2xl flex items-center justify-center">
                <svg className="w-8 h-8 text-indigo-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="2" y="4" width="20" height="16" rx="2" />
                  <path d="M22 7l-10 7L2 7" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-[var(--text-heading)] mb-2">
                Welcome to NovaSyn Social
              </h1>
              <p className="text-sm text-[var(--text-muted)] mb-6 max-w-sm mx-auto">
                AI-powered multi-channel communication orchestrator. Classify messages, generate drafts in your voice, and progressively automate proven patterns.
              </p>
              <div className="space-y-3">
                <button
                  onClick={() => setStep(1)}
                  className="w-full px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Get Started
                </button>
                <button
                  onClick={handleSkip}
                  className="w-full px-6 py-2 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                >
                  Skip setup
                </button>
              </div>
            </div>
          )}

          {/* Step 1: API Keys */}
          {step === 1 && (
            <div>
              <h2 className="text-lg font-semibold text-[var(--text-heading)] mb-1">
                Connect AI Providers
              </h2>
              <p className="text-sm text-[var(--text-muted)] mb-6">
                Add at least one API key to enable AI classification and draft generation. Keys are stored locally and shared across NovaSyn apps.
              </p>
              <div className="space-y-3 mb-6">
                {API_KEY_PROVIDERS.map((provider) => (
                  <div key={provider.key}>
                    <label className="block text-xs text-[var(--text-muted)] mb-1">
                      {provider.label}
                      {provider.required && <span className="text-red-400 ml-1">*</span>}
                    </label>
                    <input
                      type="password"
                      value={keys[provider.key] || ''}
                      onChange={(e) => setKeys({ ...keys, [provider.key]: e.target.value })}
                      className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                      placeholder={`${provider.label} API key`}
                    />
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setStep(0)}
                  className="px-4 py-2 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleSaveKeys}
                  disabled={saving}
                  className="flex-1 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  {saving ? 'Saving...' : 'Save & Continue'}
                </button>
                <button
                  onClick={() => setStep(2)}
                  className="px-4 py-2 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                >
                  Skip
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Sample message */}
          {step === 2 && (
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-6 bg-green-600/20 rounded-2xl flex items-center justify-center">
                <svg className="w-8 h-8 text-green-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-[var(--text-heading)] mb-2">
                You're all set
              </h2>
              <p className="text-sm text-[var(--text-muted)] mb-6 max-w-sm mx-auto">
                Create a sample message to explore the inbox, AI classification, draft generation, and the SPC feedback loop.
              </p>
              <div className="space-y-3">
                <button
                  onClick={handleCreateSample}
                  className="w-full px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Create Sample Message & Start
                </button>
                <button
                  onClick={handleSkip}
                  className="w-full px-6 py-2 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                >
                  Start with empty inbox
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
