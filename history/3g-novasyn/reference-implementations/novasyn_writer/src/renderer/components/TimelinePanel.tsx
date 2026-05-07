import React, { useState } from 'react';
import { useWriterStore } from '../store/writerStore';
import type { TimelineEvent } from '../../shared/types';

const EVENT_COLORS = [
  '#6366f1', '#ec4899', '#10b981', '#f59e0b', '#ef4444',
  '#8b5cf6', '#06b6d4', '#f97316', '#84cc16', '#64748b',
];

export default function TimelinePanel() {
  const {
    timelineEvents,
    chapters,
    encyclopediaEntries,
    setShowTimeline,
    createTimelineEvent,
    updateTimelineEvent,
    deleteTimelineEvent,
  } = useWriterStore();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', chapterId: '', eventDate: '', color: '#6366f1' });

  const characters = encyclopediaEntries.filter(e => e.category === 'Character');

  const handleAdd = async () => {
    if (!form.title.trim()) return;
    await createTimelineEvent({
      title: form.title.trim(),
      description: form.description.trim(),
      chapterId: form.chapterId || undefined,
      eventDate: form.eventDate || undefined,
      color: form.color,
    });
    setForm({ title: '', description: '', chapterId: '', eventDate: '', color: '#6366f1' });
    setShowAdd(false);
  };

  const handleUpdate = async (id: string, updates: Partial<TimelineEvent>) => {
    await updateTimelineEvent(id, updates);
    setEditingId(null);
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="w-[800px] max-h-[80vh] flex flex-col bg-[#16213e] rounded-lg border border-white/10 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/10 shrink-0">
          <h2 className="text-sm font-semibold text-surface-200">Timeline</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAdd(true)}
              className="text-xs px-2 py-1 bg-primary-600 text-white rounded hover:bg-primary-500"
            >
              + Add Event
            </button>
            <button
              onClick={() => setShowTimeline(false)}
              className="text-surface-500 hover:text-surface-300 text-lg leading-none"
            >
              &times;
            </button>
          </div>
        </div>

        {/* Add form */}
        {showAdd && (
          <div className="px-5 py-3 border-b border-white/10 space-y-2 bg-white/[0.02]">
            <div className="flex gap-2">
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Event title"
                className="flex-1 bg-[#1a1a2e] text-surface-200 text-xs rounded px-2 py-1.5 border border-white/10 focus:border-primary-500 focus:outline-none"
                autoFocus
              />
              <input
                type="text"
                value={form.eventDate}
                onChange={(e) => setForm({ ...form, eventDate: e.target.value })}
                placeholder="Date (e.g. Year 1, Ch 3)"
                className="w-36 bg-[#1a1a2e] text-surface-200 text-xs rounded px-2 py-1.5 border border-white/10 focus:border-primary-500 focus:outline-none"
              />
            </div>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Description (optional)"
              rows={2}
              className="w-full bg-[#1a1a2e] text-surface-200 text-xs rounded px-2 py-1.5 border border-white/10 focus:border-primary-500 focus:outline-none resize-none"
            />
            <div className="flex gap-2 items-center">
              <select
                value={form.chapterId}
                onChange={(e) => setForm({ ...form, chapterId: e.target.value })}
                className="flex-1 bg-[#1a1a2e] text-surface-200 text-xs rounded px-2 py-1.5 border border-white/10 focus:outline-none"
              >
                <option value="">No chapter</option>
                {chapters.map(ch => (
                  <option key={ch.id} value={ch.id}>{ch.title}</option>
                ))}
              </select>
              <div className="flex gap-1">
                {EVENT_COLORS.map(c => (
                  <button
                    key={c}
                    onClick={() => setForm({ ...form, color: c })}
                    className={`w-5 h-5 rounded-full border-2 ${form.color === c ? 'border-white' : 'border-transparent'}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
              <button onClick={handleAdd} className="text-xs px-3 py-1 bg-primary-600 text-white rounded hover:bg-primary-500">Add</button>
              <button onClick={() => setShowAdd(false)} className="text-xs text-surface-500 hover:text-surface-300">Cancel</button>
            </div>
          </div>
        )}

        {/* Timeline visualization */}
        <div className="flex-1 overflow-y-auto px-5 py-4 min-h-0">
          {timelineEvents.length === 0 && !showAdd && (
            <div className="text-center py-12 text-surface-500 text-sm">
              <p className="mb-2">No timeline events yet.</p>
              <p className="text-xs">Add events to map out your story's chronology.</p>
            </div>
          )}

          {/* Vertical timeline */}
          <div className="relative">
            {timelineEvents.length > 0 && (
              <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-white/10" />
            )}
            {timelineEvents.map((event, idx) => {
              const chapter = chapters.find(c => c.id === event.chapterId);
              const isEditing = editingId === event.id;
              return (
                <div key={event.id} className="relative pl-10 pb-6 group">
                  {/* Dot */}
                  <div
                    className="absolute left-2.5 top-1 w-3.5 h-3.5 rounded-full border-2 border-[#16213e]"
                    style={{ backgroundColor: event.color }}
                  />

                  {isEditing ? (
                    <EventEditor
                      event={event}
                      chapters={chapters}
                      onSave={(updates) => handleUpdate(event.id, updates)}
                      onCancel={() => setEditingId(null)}
                    />
                  ) : (
                    <div className="bg-white/[0.03] rounded-lg p-3 border border-white/5 hover:border-white/10 transition-colors">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium text-surface-200">{event.title}</span>
                            {event.eventDate && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-surface-400">{event.eventDate}</span>
                            )}
                          </div>
                          {event.description && (
                            <p className="text-xs text-surface-400 mb-1.5">{event.description}</p>
                          )}
                          {chapter && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-600/20 text-blue-300">{chapter.title}</span>
                          )}
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                          <button
                            onClick={() => setEditingId(event.id)}
                            className="text-[10px] text-surface-500 hover:text-surface-300"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => { if (confirm('Delete this event?')) deleteTimelineEvent(event.id); }}
                            className="text-[10px] text-red-400 hover:text-red-300"
                          >
                            Del
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function EventEditor({ event, chapters, onSave, onCancel }: {
  event: TimelineEvent;
  chapters: any[];
  onSave: (updates: any) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({
    title: event.title,
    description: event.description,
    chapterId: event.chapterId || '',
    eventDate: event.eventDate,
    color: event.color,
  });

  return (
    <div className="bg-white/[0.05] rounded-lg p-3 border border-primary-500/30 space-y-2">
      <div className="flex gap-2">
        <input
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          className="flex-1 bg-[#1a1a2e] text-surface-200 text-xs rounded px-2 py-1.5 border border-white/10 focus:border-primary-500 focus:outline-none"
          autoFocus
        />
        <input
          value={form.eventDate}
          onChange={(e) => setForm({ ...form, eventDate: e.target.value })}
          placeholder="Date"
          className="w-32 bg-[#1a1a2e] text-surface-200 text-xs rounded px-2 py-1.5 border border-white/10 focus:border-primary-500 focus:outline-none"
        />
      </div>
      <textarea
        value={form.description}
        onChange={(e) => setForm({ ...form, description: e.target.value })}
        rows={2}
        className="w-full bg-[#1a1a2e] text-surface-200 text-xs rounded px-2 py-1.5 border border-white/10 focus:border-primary-500 focus:outline-none resize-none"
      />
      <div className="flex gap-2 items-center">
        <select
          value={form.chapterId}
          onChange={(e) => setForm({ ...form, chapterId: e.target.value })}
          className="flex-1 bg-[#1a1a2e] text-surface-200 text-xs rounded px-2 py-1.5 border border-white/10 focus:outline-none"
        >
          <option value="">No chapter</option>
          {chapters.map(ch => (
            <option key={ch.id} value={ch.id}>{ch.title}</option>
          ))}
        </select>
        <div className="flex gap-1">
          {EVENT_COLORS.map(c => (
            <button
              key={c}
              onClick={() => setForm({ ...form, color: c })}
              className={`w-4 h-4 rounded-full border-2 ${form.color === c ? 'border-white' : 'border-transparent'}`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
        <button onClick={() => onSave(form)} className="text-xs px-2 py-1 bg-primary-600 text-white rounded">Save</button>
        <button onClick={onCancel} className="text-xs text-surface-500 hover:text-surface-300">Cancel</button>
      </div>
    </div>
  );
}
