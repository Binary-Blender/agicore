import React, { useEffect, useState } from 'react';
import { useAcademyStore } from '../store/academyStore';
import type { GamificationSettings as GamificationSettingsType } from '../../shared/types';

interface Props {
  onBack: () => void;
}

export default function GamificationSettings({ onBack }: Props) {
  const { currentStudent, loadGamificationState } = useAcademyStore();

  const [settings, setSettings] = useState<GamificationSettingsType | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (currentStudent) {
      window.electronAPI.getGamificationSettings(currentStudent.id).then(setSettings);
    }
  }, [currentStudent?.id]);

  if (!currentStudent || !settings) {
    return (
      <div className="h-full flex items-center justify-center text-[var(--text-muted)]">
        Loading settings...
      </div>
    );
  }

  const update = (key: keyof GamificationSettingsType, value: any) => {
    setSettings(prev => prev ? { ...prev, [key]: value } : prev);
    setSaved(false);
  };

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      await window.electronAPI.saveGamificationSettings(currentStudent.id, settings);
      await loadGamificationState(currentStudent.id);
      setSaved(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          >
            ← Back
          </button>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">Gamification Settings</h1>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 bg-[var(--accent)] text-white rounded-lg hover:opacity-90 disabled:opacity-50"
        >
          {saving ? 'Saving...' : saved ? 'Saved ✓' : 'Save Changes'}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Master Toggle */}
        <section className="p-4 bg-[var(--bg-secondary)] rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-[var(--text-primary)]">Enable Gamification</h2>
              <p className="text-sm text-[var(--text-muted)]">Turn XP, badges, and streaks on or off for {currentStudent.name}</p>
            </div>
            <Toggle checked={settings.enabled} onChange={v => update('enabled', v)} />
          </div>
        </section>

        {settings.enabled && (
          <>
            {/* XP Rewards */}
            <section>
              <h2 className="text-base font-semibold text-[var(--text-primary)] mb-3">XP Reward Amounts</h2>
              <div className="grid grid-cols-2 gap-3">
                <XpField label="Complete Lesson" value={settings.xpCompleteLesson} onChange={v => update('xpCompleteLesson', v)} />
                <XpField label="Assessment Pass (80%+)" value={settings.xpAssessmentPass} onChange={v => update('xpAssessmentPass', v)} />
                <XpField label="Perfect Assessment" value={settings.xpAssessmentPerfect} onChange={v => update('xpAssessmentPerfect', v)} />
                <XpField label="Complete All Daily Lessons" value={settings.xpCompleteDaily} onChange={v => update('xpCompleteDaily', v)} />
                <XpField label="Finish a Book" value={settings.xpReadingSession} onChange={v => update('xpReadingSession', v)} />
                <XpField label="Streak Day Bonus" value={settings.xpStreakDay} onChange={v => update('xpStreakDay', v)} />
                <XpField label="Bonus Challenge" value={settings.xpBonusChallenge} onChange={v => update('xpBonusChallenge', v)} />
                <XpField label="Help a Sibling" value={settings.xpHelpSibling} onChange={v => update('xpHelpSibling', v)} />
              </div>
            </section>

            {/* Display Options */}
            <section>
              <h2 className="text-base font-semibold text-[var(--text-primary)] mb-3">Display Options</h2>
              <div className="space-y-3 p-4 bg-[var(--bg-secondary)] rounded-lg">
                <ToggleRow label="Show XP Numbers" checked={settings.showXpNumbers} onChange={v => update('showXpNumbers', v)} />
                <ToggleRow label="Show Skill Tree" checked={settings.showSkillTree} onChange={v => update('showSkillTree', v)} />
                <ToggleRow label="Show Streak Counter" checked={settings.showStreak} onChange={v => update('showStreak', v)} />
                <ToggleRow label="Show Badge Collection" checked={settings.showBadges} onChange={v => update('showBadges', v)} />
              </div>
            </section>

            {/* Badge Categories */}
            <section>
              <h2 className="text-base font-semibold text-[var(--text-primary)] mb-3">Badge Categories</h2>
              <p className="text-sm text-[var(--text-muted)] mb-3">Choose which badge types can be earned</p>
              <div className="space-y-3 p-4 bg-[var(--bg-secondary)] rounded-lg">
                <ToggleRow label="🔢 Math Badges" checked={settings.badgesMath} onChange={v => update('badgesMath', v)} />
                <ToggleRow label="📖 Reading Badges" checked={settings.badgesReading} onChange={v => update('badgesReading', v)} />
                <ToggleRow label="🔥 Streak Badges" checked={settings.badgesStreak} onChange={v => update('badgesStreak', v)} />
                <ToggleRow label="📚 Subject Badges" checked={settings.badgesSubject} onChange={v => update('badgesSubject', v)} />
                <ToggleRow label="⭐ Special Badges" checked={settings.badgesSpecial} onChange={v => update('badgesSpecial', v)} />
              </div>
            </section>

            {/* Theme */}
            <section>
              <h2 className="text-base font-semibold text-[var(--text-primary)] mb-3">Theme</h2>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: 'medieval_quest', label: 'Medieval Quest', icon: '⚔️' },
                  { id: 'space_explorer', label: 'Space Explorer', icon: '🚀' },
                  { id: 'nature_ranger', label: 'Nature Ranger', icon: '🌿' },
                ].map(theme => (
                  <button
                    key={theme.id}
                    onClick={() => update('theme', theme.id)}
                    className={`p-4 rounded-lg border-2 text-center transition-colors ${
                      settings.theme === theme.id
                        ? 'border-[var(--accent)] bg-[var(--accent)]/10'
                        : 'border-[var(--border)] bg-[var(--bg-secondary)] hover:border-[var(--text-muted)]'
                    }`}
                  >
                    <div className="text-3xl mb-1">{theme.icon}</div>
                    <div className="text-sm text-[var(--text-primary)]">{theme.label}</div>
                  </button>
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative w-11 h-6 rounded-full transition-colors ${
        checked ? 'bg-[var(--accent)]' : 'bg-[var(--bg-tertiary)]'
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-[var(--text-primary)]">{label}</span>
      <Toggle checked={checked} onChange={onChange} />
    </div>
  );
}

function XpField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="p-3 bg-[var(--bg-secondary)] rounded-lg">
      <label className="text-xs text-[var(--text-muted)] block mb-1">{label}</label>
      <input
        type="number"
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        min={0}
        step={5}
        className="w-full px-2 py-1.5 bg-[var(--bg-primary)] border border-[var(--border)] rounded text-[var(--text-primary)] text-sm"
      />
    </div>
  );
}
