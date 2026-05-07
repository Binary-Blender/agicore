import React, { useEffect, useState } from 'react';

interface Settings {
  orgName: string;
  defaultPassingScore: number;
  defaultDifficulty: string;
  watchCompletionThreshold: number;
  allowQuizRetakes: boolean;
  showHintsDuringQuiz: boolean;
  randomizeQuestionOrder: boolean;
}

const DEFAULTS: Settings = {
  orgName: '',
  defaultPassingScore: 70,
  defaultDifficulty: 'intermediate',
  watchCompletionThreshold: 95,
  allowQuizRetakes: true,
  showHintsDuringQuiz: true,
  randomizeQuestionOrder: false,
};

function parseSettings(raw: Record<string, unknown>): Settings {
  return {
    orgName: String(raw.orgName ?? DEFAULTS.orgName),
    defaultPassingScore: Number(raw.defaultPassingScore ?? DEFAULTS.defaultPassingScore),
    defaultDifficulty: String(raw.defaultDifficulty ?? DEFAULTS.defaultDifficulty),
    watchCompletionThreshold: Number(raw.watchCompletionThreshold ?? DEFAULTS.watchCompletionThreshold),
    allowQuizRetakes: raw.allowQuizRetakes !== undefined ? String(raw.allowQuizRetakes) === 'true' : DEFAULTS.allowQuizRetakes,
    showHintsDuringQuiz: raw.showHintsDuringQuiz !== undefined ? String(raw.showHintsDuringQuiz) === 'true' : DEFAULTS.showHintsDuringQuiz,
    randomizeQuestionOrder: raw.randomizeQuestionOrder !== undefined ? String(raw.randomizeQuestionOrder) === 'true' : DEFAULTS.randomizeQuestionOrder,
  };
}

export function SettingsView() {
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    window.electronAPI.getSettings().then((raw) => {
      setSettings(parseSettings(raw));
    });
  }, []);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    try {
      await window.electronAPI.saveSettings({
        orgName: settings.orgName,
        defaultPassingScore: String(settings.defaultPassingScore),
        defaultDifficulty: settings.defaultDifficulty,
        watchCompletionThreshold: String(settings.watchCompletionThreshold),
        allowQuizRetakes: String(settings.allowQuizRetakes),
        showHintsDuringQuiz: String(settings.showHintsDuringQuiz),
        randomizeQuestionOrder: String(settings.randomizeQuestionOrder),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      console.error('Failed to save settings:', err);
    }
    setSaving(false);
  }

  function update<K extends keyof Settings>(key: K, value: Settings[K]) {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }

  const inputClass =
    'w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500';
  const labelClass = 'block text-sm font-medium text-gray-300 mb-1';

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Settings</h1>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-sm font-medium rounded-lg transition"
        >
          {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Settings'}
        </button>
      </div>

      {/* General Settings */}
      <section className="bg-slate-800 rounded-xl border border-slate-700 p-5 mb-5">
        <h2 className="text-lg font-semibold mb-4">General Settings</h2>

        <div className="space-y-4">
          <div>
            <label className={labelClass}>Company / Organization Name</label>
            <input
              type="text"
              className={inputClass}
              placeholder="Your organization name"
              value={settings.orgName}
              onChange={(e) => update('orgName', e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Default Passing Score (%)</label>
              <input
                type="number"
                min={0}
                max={100}
                className={inputClass}
                value={settings.defaultPassingScore}
                onChange={(e) => update('defaultPassingScore', Math.min(100, Math.max(0, Number(e.target.value))))}
              />
            </div>
            <div>
              <label className={labelClass}>Default Difficulty Level</label>
              <select
                className={inputClass}
                value={settings.defaultDifficulty}
                onChange={(e) => update('defaultDifficulty', e.target.value)}
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>
          </div>

          <div>
            <label className={labelClass}>Watch Completion Threshold (%)</label>
            <p className="text-xs text-gray-500 mb-1">
              Percentage of video a user must watch for it to count as complete.
            </p>
            <input
              type="number"
              min={0}
              max={100}
              className={inputClass}
              value={settings.watchCompletionThreshold}
              onChange={(e) => update('watchCompletionThreshold', Math.min(100, Math.max(0, Number(e.target.value))))}
            />
          </div>
        </div>
      </section>

      {/* Quiz Settings */}
      <section className="bg-slate-800 rounded-xl border border-slate-700 p-5 mb-5">
        <h2 className="text-lg font-semibold mb-4">Quiz Settings</h2>

        <div className="space-y-3">
          <ToggleRow
            label="Allow Quiz Retakes"
            description="Users can re-attempt quizzes after failing."
            checked={settings.allowQuizRetakes}
            onChange={(v) => update('allowQuizRetakes', v)}
          />
          <div className="border-t border-slate-700" />
          <ToggleRow
            label="Show Hints During Quiz"
            description="Display hint text when available on questions."
            checked={settings.showHintsDuringQuiz}
            onChange={(v) => update('showHintsDuringQuiz', v)}
          />
          <div className="border-t border-slate-700" />
          <ToggleRow
            label="Randomize Question Order"
            description="Shuffle questions each time a quiz is taken."
            checked={settings.randomizeQuestionOrder}
            onChange={(v) => update('randomizeQuestionOrder', v)}
          />
        </div>
      </section>

      {/* About */}
      <section className="bg-slate-800 rounded-xl border border-slate-700 p-5">
        <h2 className="text-lg font-semibold mb-4">About</h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-400">Application</span>
            <span className="text-gray-200">NovaSyn LMS</span>
          </div>
          <div className="border-t border-slate-700" />
          <div className="flex justify-between">
            <span className="text-gray-400">Version</span>
            <span className="text-gray-200">0.1.0 (Beta)</span>
          </div>
          <div className="border-t border-slate-700" />
          <div className="flex justify-between">
            <span className="text-gray-400">Purpose</span>
            <span className="text-gray-200">Music Video Compliance Training</span>
          </div>
        </div>
      </section>
    </div>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between py-1">
      <div>
        <p className="text-sm font-medium text-gray-200">{label}</p>
        <p className="text-xs text-gray-500">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors cursor-pointer ${
          checked ? 'bg-blue-600' : 'bg-slate-600'
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}
