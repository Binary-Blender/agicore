import React, { useEffect, useState } from 'react';
import { useAcademyStore } from '../store/academyStore';
import type { CreateGoalInput } from '../../shared/types';
import GamificationSettings from './GamificationSettings';

const LEVEL_ICONS = ['🌱', '🌿', '🌲', '⭐', '🌟', '💫', '🔥', '👑', '💎', '🏆'];

export default function LearningQuest() {
  const {
    currentStudent,
    gamificationState,
    goals,
    loadGamificationState,
    loadGoals,
    createGoal,
    updateGoal,
    deleteGoal,
  } = useAcademyStore();

  const [showSettings, setShowSettings] = useState(false);
  const [showNewGoal, setShowNewGoal] = useState(false);
  const [goalTitle, setGoalTitle] = useState('');
  const [goalTarget, setGoalTarget] = useState(100);
  const [goalType, setGoalType] = useState<'weekly' | 'monthly' | 'custom'>('weekly');
  const [goalReward, setGoalReward] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'badges' | 'log' | 'goals'>('overview');

  useEffect(() => {
    if (currentStudent) {
      loadGamificationState(currentStudent.id);
      loadGoals(currentStudent.id);
    }
  }, [currentStudent?.id]);

  if (!currentStudent) {
    return (
      <div className="h-full flex items-center justify-center text-[var(--text-muted)]">
        Select a student to view Learning Quest
      </div>
    );
  }

  if (showSettings) {
    return <GamificationSettings onBack={() => setShowSettings(false)} />;
  }

  if (!gamificationState) {
    return (
      <div className="h-full flex items-center justify-center text-[var(--text-muted)]">
        Loading...
      </div>
    );
  }

  if (!gamificationState.settings.enabled) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="text-6xl">🎮</div>
          <h2 className="text-xl font-semibold text-[var(--text-primary)]">Learning Quest is Disabled</h2>
          <p className="text-[var(--text-muted)]">Enable gamification in settings to start earning XP and badges!</p>
          <button
            onClick={() => setShowSettings(true)}
            className="px-4 py-2 bg-[var(--accent)] text-white rounded-lg hover:opacity-90"
          >
            Open Settings
          </button>
        </div>
      </div>
    );
  }

  const { totalXp, level, levelName, xpToNextLevel, streak, badges, recentXp, todayXp } = gamificationState;
  const levelIcon = LEVEL_ICONS[Math.min(level - 1, LEVEL_ICONS.length - 1)];

  // Calculate XP progress to next level
  const currentLevelXp = level <= 1 ? 0 : [0, 0, 100, 250, 500, 1000, 2000, 3500, 5500, 8000][level - 1] || 0;
  const nextLevelXp = currentLevelXp + xpToNextLevel;
  const xpInLevel = totalXp - currentLevelXp;
  const xpNeeded = nextLevelXp - currentLevelXp;
  const progressPct = xpNeeded > 0 ? Math.min((xpInLevel / xpNeeded) * 100, 100) : 100;

  const activeGoals = goals.filter(g => g.status === 'active');
  const completedGoals = goals.filter(g => g.status === 'completed');

  const handleCreateGoal = async () => {
    if (!goalTitle.trim()) return;
    const now = new Date();
    let endDate: Date;
    if (goalType === 'weekly') {
      endDate = new Date(now);
      endDate.setDate(endDate.getDate() + (7 - endDate.getDay()));
    } else if (goalType === 'monthly') {
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    } else {
      endDate = new Date(now);
      endDate.setDate(endDate.getDate() + 14);
    }

    const input: CreateGoalInput = {
      studentId: currentStudent.id,
      title: goalTitle,
      goalType,
      targetXp: goalTarget,
      rewardText: goalReward,
      startDate: now.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
    };
    await createGoal(input);
    setGoalTitle('');
    setGoalTarget(100);
    setGoalReward('');
    setShowNewGoal(false);
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{levelIcon}</span>
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">Learning Quest</h1>
            <p className="text-sm text-[var(--text-muted)]">{currentStudent.name}'s Adventure</p>
          </div>
        </div>
        <button
          onClick={() => setShowSettings(true)}
          className="px-3 py-1.5 text-sm bg-[var(--bg-tertiary)] text-[var(--text-secondary)] rounded-lg hover:bg-[var(--bg-hover)]"
        >
          Settings
        </button>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-4 gap-3 p-4 bg-[var(--bg-secondary)]">
        <div className="text-center">
          <div className="text-2xl font-bold text-[var(--accent)]">{totalXp}</div>
          <div className="text-xs text-[var(--text-muted)]">Total XP</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-[var(--text-primary)]">{levelIcon} {level}</div>
          <div className="text-xs text-[var(--text-muted)]">{levelName}</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-orange-400">
            {streak.currentStreak > 0 ? '🔥' : '❄️'} {streak.currentStreak}
          </div>
          <div className="text-xs text-[var(--text-muted)]">Day Streak</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-400">+{todayXp}</div>
          <div className="text-xs text-[var(--text-muted)]">Today's XP</div>
        </div>
      </div>

      {/* XP Progress Bar */}
      <div className="px-4 py-2 bg-[var(--bg-secondary)] border-b border-[var(--border)]">
        <div className="flex justify-between text-xs text-[var(--text-muted)] mb-1">
          <span>Level {level} → Level {level + 1}</span>
          <span>{xpInLevel} / {xpNeeded} XP</span>
        </div>
        <div className="w-full h-3 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[var(--accent)] to-purple-500 rounded-full transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[var(--border)] px-4">
        {(['overview', 'badges', 'goals', 'log'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab
                ? 'border-[var(--accent)] text-[var(--accent)]'
                : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
            }`}
          >
            {tab === 'overview' && '📊 Overview'}
            {tab === 'badges' && `🏅 Badges (${badges.length})`}
            {tab === 'goals' && `🎯 Goals (${activeGoals.length})`}
            {tab === 'log' && '📜 XP Log'}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Daily Quests */}
            <section>
              <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-3">Daily Quests</h2>
              <div className="space-y-2">
                <QuestItem
                  icon="📚"
                  title="Complete a lesson"
                  xp={gamificationState.settings.xpCompleteLesson}
                  hint="Mark any lesson as complete"
                />
                <QuestItem
                  icon="✅"
                  title="Finish all today's lessons"
                  xp={gamificationState.settings.xpCompleteDaily}
                  hint="Complete every lesson scheduled for today"
                />
                <QuestItem
                  icon="📖"
                  title="Read a book"
                  xp={gamificationState.settings.xpReadingSession}
                  hint="Mark a reading entry as completed"
                />
                <QuestItem
                  icon="🔥"
                  title="Keep your streak going"
                  xp={gamificationState.settings.xpStreakDay}
                  hint="Complete at least one lesson today"
                />
              </div>
            </section>

            {/* Recent Badges */}
            {badges.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-3">Recent Badges</h2>
                <div className="grid grid-cols-4 gap-3">
                  {badges.slice(0, 4).map(badge => (
                    <div key={badge.id} className="flex flex-col items-center p-3 bg-[var(--bg-secondary)] rounded-lg">
                      <span className="text-3xl mb-1">{badge.badgeIcon}</span>
                      <span className="text-xs text-[var(--text-primary)] text-center font-medium">{badge.badgeName}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Active Goals */}
            {activeGoals.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-3">Active Goals</h2>
                <div className="space-y-2">
                  {activeGoals.map(goal => {
                    const pct = goal.targetXp > 0 ? Math.min((goal.earnedXp / goal.targetXp) * 100, 100) : 0;
                    return (
                      <div key={goal.id} className="p-3 bg-[var(--bg-secondary)] rounded-lg">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-medium text-[var(--text-primary)]">🎯 {goal.title}</span>
                          <span className="text-xs text-[var(--text-muted)]">{goal.earnedXp}/{goal.targetXp} XP</span>
                        </div>
                        <div className="w-full h-2 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
                          <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                        </div>
                        {goal.rewardText && (
                          <div className="text-xs text-[var(--text-muted)] mt-1">🎁 Reward: {goal.rewardText}</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Streak Info */}
            <section>
              <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-3">Streak</h2>
              <div className="flex gap-4">
                <div className="flex-1 p-4 bg-[var(--bg-secondary)] rounded-lg text-center">
                  <div className="text-4xl mb-1">{streak.currentStreak > 0 ? '🔥' : '❄️'}</div>
                  <div className="text-2xl font-bold text-[var(--text-primary)]">{streak.currentStreak}</div>
                  <div className="text-xs text-[var(--text-muted)]">Current Streak</div>
                </div>
                <div className="flex-1 p-4 bg-[var(--bg-secondary)] rounded-lg text-center">
                  <div className="text-4xl mb-1">🏆</div>
                  <div className="text-2xl font-bold text-[var(--text-primary)]">{streak.longestStreak}</div>
                  <div className="text-xs text-[var(--text-muted)]">Best Streak</div>
                </div>
              </div>
            </section>
          </div>
        )}

        {activeTab === 'badges' && (
          <div>
            {badges.length === 0 ? (
              <div className="text-center py-12 text-[var(--text-muted)]">
                <div className="text-5xl mb-3">🏅</div>
                <p>No badges earned yet. Keep learning to unlock them!</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-4">
                {badges.map(badge => (
                  <div key={badge.id} className="flex flex-col items-center p-4 bg-[var(--bg-secondary)] rounded-lg hover:bg-[var(--bg-hover)] transition-colors">
                    <span className="text-4xl mb-2">{badge.badgeIcon}</span>
                    <span className="text-sm font-medium text-[var(--text-primary)] text-center">{badge.badgeName}</span>
                    <span className="text-xs text-[var(--text-muted)] text-center mt-1">{badge.badgeDescription}</span>
                    <span className="text-xs text-[var(--text-muted)] mt-2">
                      {new Date(badge.earnedAt).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'goals' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">Goals</h2>
              <button
                onClick={() => setShowNewGoal(!showNewGoal)}
                className="px-3 py-1.5 text-sm bg-[var(--accent)] text-white rounded-lg hover:opacity-90"
              >
                + New Goal
              </button>
            </div>

            {showNewGoal && (
              <div className="p-4 bg-[var(--bg-secondary)] rounded-lg space-y-3">
                <input
                  type="text"
                  value={goalTitle}
                  onChange={e => setGoalTitle(e.target.value)}
                  placeholder="Goal title (e.g., 'Read 3 books this week')"
                  className="w-full px-3 py-2 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] text-sm"
                />
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs text-[var(--text-muted)]">Type</label>
                    <select
                      value={goalType}
                      onChange={e => setGoalType(e.target.value as any)}
                      className="w-full px-3 py-2 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] text-sm"
                    >
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                      <option value="custom">Custom (2 weeks)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-[var(--text-muted)]">Target XP</label>
                    <input
                      type="number"
                      value={goalTarget}
                      onChange={e => setGoalTarget(Number(e.target.value))}
                      min={10}
                      step={10}
                      className="w-full px-3 py-2 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-[var(--text-muted)]">Reward (optional)</label>
                    <input
                      type="text"
                      value={goalReward}
                      onChange={e => setGoalReward(e.target.value)}
                      placeholder="e.g., Pizza night!"
                      className="w-full px-3 py-2 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] text-sm"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setShowNewGoal(false)}
                    className="px-3 py-1.5 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateGoal}
                    disabled={!goalTitle.trim()}
                    className="px-4 py-1.5 text-sm bg-[var(--accent)] text-white rounded-lg hover:opacity-90 disabled:opacity-50"
                  >
                    Create Goal
                  </button>
                </div>
              </div>
            )}

            {/* Active Goals */}
            {activeGoals.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-[var(--text-muted)]">Active</h3>
                {activeGoals.map(goal => {
                  const pct = goal.targetXp > 0 ? Math.min((goal.earnedXp / goal.targetXp) * 100, 100) : 0;
                  const daysLeft = Math.max(0, Math.ceil((new Date(goal.endDate).getTime() - Date.now()) / 86400000));
                  return (
                    <div key={goal.id} className="p-3 bg-[var(--bg-secondary)] rounded-lg">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <span className="text-sm font-medium text-[var(--text-primary)]">{goal.title}</span>
                          <div className="text-xs text-[var(--text-muted)]">
                            {goal.goalType} · {daysLeft} days left
                          </div>
                        </div>
                        <button
                          onClick={() => deleteGoal(goal.id)}
                          className="text-xs text-red-400 hover:text-red-300"
                        >
                          Remove
                        </button>
                      </div>
                      <div className="flex items-center gap-2 mb-1">
                        <div className="flex-1 h-2 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
                          <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs text-[var(--text-muted)]">{goal.earnedXp}/{goal.targetXp}</span>
                      </div>
                      {goal.rewardText && (
                        <div className="text-xs text-[var(--text-muted)]">🎁 {goal.rewardText}</div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Completed Goals */}
            {completedGoals.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-[var(--text-muted)]">Completed</h3>
                {completedGoals.map(goal => (
                  <div key={goal.id} className="p-3 bg-[var(--bg-secondary)] rounded-lg opacity-70">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-[var(--text-primary)]">✅ {goal.title}</span>
                      <span className="text-xs text-green-400">{goal.targetXp} XP earned</span>
                    </div>
                    {goal.rewardText && (
                      <div className="text-xs text-[var(--text-muted)] mt-1">🎁 {goal.rewardText}</div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {activeGoals.length === 0 && completedGoals.length === 0 && !showNewGoal && (
              <div className="text-center py-12 text-[var(--text-muted)]">
                <div className="text-5xl mb-3">🎯</div>
                <p>No goals yet. Create one to stay motivated!</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'log' && (
          <div>
            {recentXp.length === 0 ? (
              <div className="text-center py-12 text-[var(--text-muted)]">
                <div className="text-5xl mb-3">📜</div>
                <p>No XP earned yet. Complete lessons to start earning!</p>
              </div>
            ) : (
              <div className="space-y-1">
                {recentXp.map(entry => (
                  <div key={entry.id} className="flex items-center justify-between p-2.5 bg-[var(--bg-secondary)] rounded-lg">
                    <div>
                      <span className="text-sm text-[var(--text-primary)]">{entry.reason}</span>
                      <div className="text-xs text-[var(--text-muted)]">
                        {new Date(entry.createdAt).toLocaleString()} · {entry.category}
                      </div>
                    </div>
                    <span className="text-sm font-bold text-green-400">+{entry.amount} XP</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function QuestItem({ icon, title, xp, hint }: { icon: string; title: string; xp: number; hint: string }) {
  return (
    <div className="flex items-center gap-3 p-3 bg-[var(--bg-secondary)] rounded-lg">
      <span className="text-2xl">{icon}</span>
      <div className="flex-1">
        <div className="text-sm font-medium text-[var(--text-primary)]">{title}</div>
        <div className="text-xs text-[var(--text-muted)]">{hint}</div>
      </div>
      <span className="text-sm font-bold text-[var(--accent)]">+{xp} XP</span>
    </div>
  );
}
