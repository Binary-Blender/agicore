import React, { useState } from 'react';
import { useCouncilStore } from '../store/councilStore';
import type { MeetingType } from '../../shared/types';

const MEETING_TYPES: { value: MeetingType; label: string; description: string }[] = [
  { value: 'brainstorm', label: 'Brainstorm', description: 'Free-flowing idea generation. All personas contribute simultaneously.' },
  { value: 'review', label: 'Review', description: 'Present work for structured feedback from each persona.' },
  { value: 'standup', label: 'Standup', description: 'Quick status updates from each team member.' },
  { value: 'decision', label: 'Decision', description: 'Structured debate and vote on a specific question.' },
  { value: 'pipeline', label: 'Pipeline', description: 'Sequential workflow — each persona builds on the previous.' },
];

const TYPE_COLORS: Record<string, string> = {
  brainstorm: 'border-yellow-500/40 bg-yellow-600/10',
  review: 'border-blue-500/40 bg-blue-600/10',
  standup: 'border-green-500/40 bg-green-600/10',
  decision: 'border-red-500/40 bg-red-600/10',
  pipeline: 'border-purple-500/40 bg-purple-600/10',
};

export default function MeetingCreator() {
  const { personas, setShowMeetingCreator, createMeeting } = useCouncilStore();

  const [title, setTitle] = useState('');
  const [meetingType, setMeetingType] = useState<MeetingType>('brainstorm');
  const [agenda, setAgenda] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const toggleParticipant = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const handleCreate = async () => {
    if (selectedIds.length === 0 || !title.trim()) return;
    await createMeeting({
      title: title.trim(),
      meetingType,
      agenda: agenda.trim() || undefined,
      participantIds: selectedIds,
    });
  };

  const canCreate = title.trim() && selectedIds.length > 0;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowMeetingCreator(false)}>
      <div className="w-[560px] max-h-[80vh] flex flex-col bg-[#16213e] rounded-xl border border-white/10 shadow-2xl" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/5">
          <h2 className="text-sm font-semibold text-surface-200">New Meeting</h2>
          <button
            onClick={() => setShowMeetingCreator(false)}
            className="text-surface-500 hover:text-surface-300 transition-colors text-lg"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-xs text-surface-400 mb-1">Meeting Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Q2 Feature Planning"
              className="w-full px-3 py-2 text-sm bg-[var(--bg-input)] border border-white/10 rounded-lg text-surface-200 placeholder:text-surface-600 focus:outline-none focus:border-primary-500/50"
            />
          </div>

          {/* Meeting Type */}
          <div>
            <label className="block text-xs text-surface-400 mb-2">Meeting Type</label>
            <div className="grid grid-cols-5 gap-1.5">
              {MEETING_TYPES.map(mt => (
                <button
                  key={mt.value}
                  onClick={() => setMeetingType(mt.value)}
                  className={`px-2 py-2 text-xs rounded-lg border transition-all text-center ${
                    meetingType === mt.value
                      ? TYPE_COLORS[mt.value] + ' text-surface-200'
                      : 'border-white/5 bg-white/[0.02] text-surface-500 hover:bg-white/[0.05]'
                  }`}
                >
                  {mt.label}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-surface-500 mt-1.5">
              {MEETING_TYPES.find(mt => mt.value === meetingType)?.description}
            </p>
          </div>

          {/* Agenda */}
          <div>
            <label className="block text-xs text-surface-400 mb-1">Agenda (optional)</label>
            <textarea
              value={agenda}
              onChange={(e) => setAgenda(e.target.value)}
              placeholder="What should the team discuss?"
              rows={3}
              className="w-full px-3 py-2 text-sm bg-[var(--bg-input)] border border-white/10 rounded-lg text-surface-200 placeholder:text-surface-600 focus:outline-none focus:border-primary-500/50 resize-none"
            />
          </div>

          {/* Participants */}
          <div>
            <label className="block text-xs text-surface-400 mb-2">
              Participants * <span className="text-surface-600">({selectedIds.length} selected)</span>
            </label>

            {personas.length === 0 ? (
              <p className="text-xs text-surface-500 text-center py-4">
                No personas yet. Create personas first to add them to meetings.
              </p>
            ) : (
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {personas.map(persona => {
                  const isSelected = selectedIds.includes(persona.id);
                  const order = selectedIds.indexOf(persona.id);
                  return (
                    <button
                      key={persona.id}
                      onClick={() => toggleParticipant(persona.id)}
                      className={`w-full flex items-center gap-3 p-2.5 rounded-lg border text-left transition-all ${
                        isSelected
                          ? 'border-primary-500/40 bg-primary-600/10'
                          : 'border-white/5 bg-white/[0.02] hover:bg-white/[0.05]'
                      }`}
                    >
                      <div className="text-xl">{persona.avatarEmoji}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-surface-200 truncate">{persona.name}</p>
                        <p className="text-[10px] text-surface-500 truncate">{persona.role}</p>
                      </div>
                      {isSelected && (
                        <span className="text-[10px] text-primary-400 bg-primary-600/20 px-1.5 py-0.5 rounded">
                          #{order + 1}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
            <p className="text-[10px] text-surface-600 mt-1">
              Click to select. Order determines speaking order.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-white/5">
          <button
            onClick={() => setShowMeetingCreator(false)}
            className="px-4 py-2 text-xs bg-white/5 hover:bg-white/10 text-surface-300 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={!canCreate}
            className="px-4 py-2 text-xs bg-primary-600 hover:bg-primary-500 text-white rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Start Meeting
          </button>
        </div>
      </div>
    </div>
  );
}
