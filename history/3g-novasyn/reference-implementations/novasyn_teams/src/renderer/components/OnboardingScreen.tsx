import React, { useState } from 'react';
import { useTeamsStore } from '../store/teamsStore';

export function OnboardingScreen() {
  const createTeam = useTeamsStore((s) => s.createTeam);
  const setDisplayName = useTeamsStore((s) => s.setDisplayName);

  const [mode, setMode] = useState<'choose' | 'create' | 'join'>('choose');
  const [teamName, setTeamName] = useState('');
  const [teamId, setTeamId] = useState('');
  const [displayNameInput, setDisplayNameInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCreateTeam = async () => {
    if (!teamName.trim()) {
      setError('Please enter a team name.');
      return;
    }
    if (!displayNameInput.trim()) {
      setError('Please enter a display name.');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      // Save display name setting
      await window.electronAPI.updateSettings({
        displayName: displayNameInput.trim(),
      });
      setDisplayName(displayNameInput.trim());

      // Create the team
      const team = await createTeam(teamName.trim());
      if (!team) {
        setError('Failed to create team. Please try again.');
      }
    } catch (err) {
      console.error('Failed to create team:', err);
      setError('An error occurred. Please try again.');
    }
    setIsLoading(false);
  };

  const handleJoinTeam = async () => {
    if (!teamId.trim()) {
      setError('Please enter a team ID.');
      return;
    }
    if (!displayNameInput.trim()) {
      setError('Please enter a display name.');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      await window.electronAPI.updateSettings({
        displayName: displayNameInput.trim(),
      });
      setDisplayName(displayNameInput.trim());

      // Attempt to join — v1 this is a placeholder
      await window.electronAPI.memberInvite({
        teamId: teamId.trim(),
        displayName: displayNameInput.trim(),
      });
    } catch (err) {
      console.error('Failed to join team:', err);
      setError('Could not join team. Check the ID and try again.');
    }
    setIsLoading(false);
  };

  return (
    <div className="flex-1 flex items-center justify-center bg-slate-900">
      <div className="w-[460px]">
        {/* Logo + Title */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-400 to-blue-500 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-teal-500/20">
            <span className="text-white text-2xl font-bold">T</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Welcome to NovaSyn Teams</h1>
          <p className="text-sm text-gray-400 mt-2">
            Team communication with AI-native infrastructure
          </p>
        </div>

        {/* Mode chooser */}
        {mode === 'choose' && (
          <div className="space-y-3">
            {/* Display name first */}
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 mb-4">
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Your Display Name</label>
              <input
                type="text"
                value={displayNameInput}
                onChange={(e) => setDisplayNameInput(e.target.value)}
                placeholder="How your team will see you"
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-teal-500"
              />
            </div>

            <button
              onClick={() => setMode('create')}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl p-5 text-left hover:border-teal-500/50 hover:bg-slate-800/80 transition group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-teal-600/20 flex items-center justify-center flex-shrink-0 group-hover:bg-teal-600/30 transition">
                  <svg className="w-5 h-5 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">Create a Team</h3>
                  <p className="text-xs text-gray-400 mt-0.5">Start a new team and invite your members</p>
                </div>
              </div>
            </button>

            <button
              onClick={() => setMode('join')}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl p-5 text-left hover:border-blue-500/50 hover:bg-slate-800/80 transition group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-600/20 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-600/30 transition">
                  <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">Join a Team</h3>
                  <p className="text-xs text-gray-400 mt-0.5">Enter a team ID to join an existing team</p>
                </div>
              </div>
            </button>

            {/* API key note */}
            <div className="mt-4 p-3 bg-slate-800/50 rounded-lg border border-slate-700">
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <svg className="w-4 h-4 text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>
                  API keys are shared across all NovaSyn apps via the shared key store.
                  Configure them in Settings after setup.
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Create team form */}
        {mode === 'create' && (
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
            <button
              onClick={() => { setMode('choose'); setError(''); }}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-white mb-4 transition"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>

            <h2 className="text-lg font-semibold text-white mb-4">Create a Team</h2>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Team Name</label>
                <input
                  type="text"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  placeholder="My Awesome Team"
                  autoFocus
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Your Display Name</label>
                <input
                  type="text"
                  value={displayNameInput}
                  onChange={(e) => setDisplayNameInput(e.target.value)}
                  placeholder="Your Name"
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-teal-500"
                />
              </div>

              {error && (
                <div className="text-xs text-red-400 bg-red-900/20 rounded px-3 py-2">{error}</div>
              )}

              <button
                onClick={handleCreateTeam}
                disabled={isLoading}
                className="w-full bg-teal-600 hover:bg-teal-500 text-white text-sm font-medium py-2.5 rounded-lg transition disabled:opacity-50"
              >
                {isLoading ? 'Creating...' : 'Create Team'}
              </button>
            </div>
          </div>
        )}

        {/* Join team form */}
        {mode === 'join' && (
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
            <button
              onClick={() => { setMode('choose'); setError(''); }}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-white mb-4 transition"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>

            <h2 className="text-lg font-semibold text-white mb-4">Join a Team</h2>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Team ID</label>
                <input
                  type="text"
                  value={teamId}
                  onChange={(e) => setTeamId(e.target.value)}
                  placeholder="Paste the team ID here"
                  autoFocus
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Your Display Name</label>
                <input
                  type="text"
                  value={displayNameInput}
                  onChange={(e) => setDisplayNameInput(e.target.value)}
                  placeholder="Your Name"
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-teal-500"
                />
              </div>

              {error && (
                <div className="text-xs text-red-400 bg-red-900/20 rounded px-3 py-2">{error}</div>
              )}

              <button
                onClick={handleJoinTeam}
                disabled={isLoading}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium py-2.5 rounded-lg transition disabled:opacity-50"
              >
                {isLoading ? 'Joining...' : 'Join Team'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
