import React from 'react';
import { useCouncilStore } from '../store/councilStore';

const MODEL_COLORS: Record<string, string> = {
  anthropic: 'bg-orange-600/20 text-orange-300',
  openai: 'bg-green-600/20 text-green-300',
  google: 'bg-blue-600/20 text-blue-300',
  xai: 'bg-purple-600/20 text-purple-300',
};

export default function Dashboard() {
  const {
    personas,
    models,
    meetings,
    actionItems,
    selectPersona,
    selectMeeting,
    setShowPersonaBuilder,
    setEditingPersona,
    setShowMeetingCreator,
    loadMeetings,
    loadActionItems,
    updateActionItem,
  } = useCouncilStore();

  // Load meetings and all action items on mount
  React.useEffect(() => { loadMeetings(); loadActionItems(); }, []);

  const getModelInfo = (modelId: string) => models.find(m => m.id === modelId);

  return (
    <div className="flex-1 overflow-y-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-surface-200 mb-1">Welcome to NovaSyn Council</h1>
        <p className="text-sm text-surface-500">
          {personas.length === 0
            ? 'Create your first persona to get started.'
            : `${personas.length} persona${personas.length === 1 ? '' : 's'} in your council.`
          }
        </p>
      </div>

      {/* Quick actions */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => {
            setEditingPersona(null);
            setShowPersonaBuilder(true);
          }}
          className="px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white text-sm rounded-lg transition-colors"
        >
          + New Persona
        </button>
        {personas.length >= 2 && (
          <button
            onClick={() => setShowMeetingCreator(true)}
            className="px-4 py-2 bg-white/5 hover:bg-white/10 text-surface-300 text-sm rounded-lg border border-white/10 transition-colors"
          >
            + New Meeting
          </button>
        )}
      </div>

      {/* Persona grid */}
      {personas.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="text-5xl mb-4">🏛️</div>
          <h2 className="text-lg font-semibold text-surface-300 mb-2">No personas yet</h2>
          <p className="text-sm text-surface-500 mb-4 max-w-md">
            Create AI personas with unique roles, knowledge, and personalities.
            Each persona remembers past conversations and carries your project knowledge.
          </p>
          <button
            onClick={() => {
              setEditingPersona(null);
              setShowPersonaBuilder(true);
            }}
            className="px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white text-sm rounded-lg transition-colors"
          >
            Create Your First Persona
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {personas.map((persona) => {
            const modelInfo = getModelInfo(persona.model);
            const providerColor = modelInfo ? MODEL_COLORS[modelInfo.provider] || 'bg-surface-600/20 text-surface-400' : 'bg-surface-600/20 text-surface-400';

            return (
              <button
                key={persona.id}
                onClick={() => selectPersona(persona)}
                className="bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 hover:border-white/10 rounded-lg p-4 text-left transition-all group"
              >
                <div className="flex items-start gap-3 mb-3">
                  <div className="text-3xl">{persona.avatarEmoji}</div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-surface-200 truncate">{persona.name}</h3>
                    <p className="text-xs text-surface-500 truncate">{persona.role}</p>
                  </div>
                </div>

                {/* Model badge */}
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${providerColor}`}>
                    {modelInfo?.name || persona.model}
                  </span>
                  {persona.department && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-surface-400">
                      {persona.department}
                    </span>
                  )}
                </div>

                {/* Stats */}
                <div className="flex items-center gap-3 text-[10px] text-surface-600">
                  <span>{persona.totalConversations} chats</span>
                  <span>{persona.totalTokensUsed.toLocaleString()} tokens</span>
                </div>

                {/* Bio preview */}
                {persona.bio && (
                  <p className="text-[11px] text-surface-500 mt-2 line-clamp-2">{persona.bio}</p>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Pending Action Items */}
      {actionItems.filter(i => i.status === 'pending' || i.status === 'in_progress').length > 0 && (
        <div className="mt-8">
          <h2 className="text-sm font-semibold text-surface-300 mb-3">
            Pending Action Items ({actionItems.filter(i => i.status === 'pending' || i.status === 'in_progress').length})
          </h2>
          <div className="space-y-1.5">
            {actionItems
              .filter(i => i.status === 'pending' || i.status === 'in_progress')
              .slice(0, 8)
              .map(item => {
                const meeting = meetings.find(m => m.id === item.meetingId);
                return (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 p-3 bg-white/[0.02] rounded-lg border border-white/5"
                  >
                    <button
                      onClick={() => updateActionItem(item.id, { status: item.status === 'pending' ? 'in_progress' : 'completed' })}
                      className={`text-[9px] px-1.5 py-0.5 rounded shrink-0 transition-colors ${
                        item.status === 'in_progress'
                          ? 'bg-blue-600/20 text-blue-300 hover:bg-green-600/20 hover:text-green-300'
                          : 'bg-yellow-600/20 text-yellow-300 hover:bg-blue-600/20 hover:text-blue-300'
                      }`}
                      title={item.status === 'pending' ? 'Mark in progress' : 'Mark complete'}
                    >
                      {item.status === 'in_progress' ? 'In Progress' : 'Pending'}
                    </button>
                    <span className={`text-[9px] px-1 py-0.5 rounded shrink-0 ${
                      item.priority === 'high' ? 'bg-red-600/20 text-red-300' :
                      item.priority === 'low' ? 'bg-surface-600/20 text-surface-400' :
                      'bg-yellow-600/20 text-yellow-300'
                    }`}>
                      {item.priority}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-surface-200 truncate">{item.task}</p>
                      <div className="flex items-center gap-2 text-[10px] text-surface-500">
                        <span>{item.assigneeName}</span>
                        {meeting && <span>from: {meeting.title}</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Recent Meetings */}
      {meetings.length > 0 && (
        <div className="mt-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-surface-300">Recent Meetings</h2>
            <button
              onClick={() => setShowMeetingCreator(true)}
              className="text-xs text-primary-400 hover:text-primary-300 transition-colors"
            >
              + New Meeting
            </button>
          </div>
          <div className="space-y-1.5">
            {meetings.slice(0, 5).map(meeting => {
              const meetingPersonas = meeting.participantIds
                .map(id => personas.find(p => p.id === id))
                .filter(Boolean);
              return (
                <button
                  key={meeting.id}
                  onClick={() => selectMeeting(meeting)}
                  className="w-full flex items-center gap-3 p-3 bg-white/[0.02] hover:bg-white/[0.05] rounded-lg border border-white/5 text-left transition-colors"
                >
                  <div className="flex -space-x-1">
                    {meetingPersonas.slice(0, 4).map(p => (
                      <span key={p!.id} className="text-sm">{p!.avatarEmoji}</span>
                    ))}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-surface-200 truncate">{meeting.title}</p>
                    <div className="flex items-center gap-2 text-[10px] text-surface-500">
                      <span className={`px-1 py-0.5 rounded ${
                        meeting.meetingType === 'brainstorm' ? 'bg-yellow-600/20 text-yellow-300' :
                        meeting.meetingType === 'review' ? 'bg-blue-600/20 text-blue-300' :
                        meeting.meetingType === 'decision' ? 'bg-red-600/20 text-red-300' :
                        'bg-surface-600/20 text-surface-400'
                      }`}>{meeting.meetingType}</span>
                      {meeting.status === 'completed' && <span className="text-surface-500">Ended</span>}
                      <span>{meeting.totalTokens.toLocaleString()} tokens</span>
                      <span>${meeting.totalCost.toFixed(4)}</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
