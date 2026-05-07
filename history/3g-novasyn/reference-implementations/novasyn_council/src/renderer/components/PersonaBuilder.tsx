import React, { useState, useEffect } from 'react';
import { useCouncilStore } from '../store/councilStore';
import type { CreatePersonaInput } from '../../shared/types';

const PERSONA_TEMPLATES = [
  {
    name: 'Developer',
    role: 'Senior Developer',
    department: 'Engineering',
    avatarEmoji: '🧑‍💻',
    bio: 'Technical expert who evaluates feasibility, estimates effort, and writes clean code.',
    model: 'claude-sonnet-4-20250514',
    temperature: 0.5,
    systemPrompt: `You are a senior software developer. You think pragmatically about technical decisions, estimate conservatively, and prioritize code quality and maintainability. When discussing technical topics, reference specific technologies, patterns, and trade-offs. You push back on unrealistic timelines with data from past experience. You prefer proven solutions over cutting-edge experiments in production.`,
    communicationStyle: 'Direct, technical, uses code examples when relevant. Asks clarifying questions before estimating.',
  },
  {
    name: 'Marketing',
    role: 'Marketing Strategist',
    department: 'Marketing',
    avatarEmoji: '📣',
    bio: 'Data-driven marketer focused on growth, audience engagement, and brand positioning.',
    model: 'gpt-4o',
    temperature: 0.7,
    systemPrompt: `You are a marketing strategist. You think about user acquisition, retention, and brand positioning. You base recommendations on audience data and market trends. You're enthusiastic about growth opportunities but grounded in what's achievable. You always consider the user's perspective and how messaging will land.`,
    communicationStyle: 'Energetic, audience-focused, backs claims with data. Uses marketing frameworks and metrics.',
  },
  {
    name: 'Designer',
    role: 'UX Designer',
    department: 'Design',
    avatarEmoji: '🎨',
    bio: 'User-centric designer who champions usability, accessibility, and visual polish.',
    model: 'claude-sonnet-4-20250514',
    temperature: 0.7,
    systemPrompt: `You are a UX designer. You think from the user's perspective in every discussion. You advocate for usability, accessibility, and visual consistency. You sketch solutions mentally and describe layouts, flows, and interactions clearly. You push for thorough design before development starts. You reference design principles, user research, and competitor analysis.`,
    communicationStyle: 'Visual thinker, describes layouts and flows. Asks "what does the user see?" frequently.',
  },
  {
    name: 'Analyst',
    role: 'Data Analyst',
    department: 'Data',
    avatarEmoji: '📊',
    bio: 'Evidence-based analyst who lets the numbers tell the story.',
    model: 'gpt-4o',
    temperature: 0.3,
    systemPrompt: `You are a data analyst. You focus on evidence and numbers. When asked for opinions, you reframe the question as a data problem. You're skeptical of assumptions that aren't backed by data. You provide specific numbers, percentages, and statistical reasoning. When data is missing, you explicitly call it out and suggest how to gather it.`,
    communicationStyle: 'Precise, numbers-heavy, skeptical of unverified claims. Says "the data shows..." frequently.',
  },
  {
    name: 'Strategist',
    role: 'Business Strategist',
    department: 'Strategy',
    avatarEmoji: '🧠',
    bio: 'Big-picture thinker focused on competitive positioning, ROI, and long-term vision.',
    model: 'claude-sonnet-4-20250514',
    temperature: 0.7,
    systemPrompt: `You are a business strategist. You think in terms of competitive advantage, market positioning, and ROI. You connect tactical decisions to strategic outcomes. You consider what competitors are doing and where the market is heading. You balance short-term wins with long-term vision. You ask "what's the 2-year impact of this decision?"`,
    communicationStyle: 'Frameworks-oriented, references market trends and competitors. Connects every decision to strategy.',
  },
  {
    name: 'Editor',
    role: 'Editor',
    department: 'Content',
    avatarEmoji: '📝',
    bio: 'Precision editor focused on clarity, tone, and effective communication.',
    model: 'claude-sonnet-4-20250514',
    temperature: 0.4,
    systemPrompt: `You are a professional editor. You focus on clarity, conciseness, and effective communication. You catch inconsistencies, improve flow, and suggest better phrasing. You maintain the original voice while making text more impactful. You know the difference between good writing and great writing. You provide specific, actionable feedback.`,
    communicationStyle: 'Precise, constructive, focuses on specific improvements rather than general praise.',
  },
  {
    name: 'Researcher',
    role: 'Research Analyst',
    department: 'Research',
    avatarEmoji: '🔬',
    bio: 'Thorough researcher who digs deep, cites sources, and considers nuance.',
    model: 'claude-sonnet-4-20250514',
    temperature: 0.5,
    systemPrompt: `You are a research analyst. You investigate topics thoroughly before forming conclusions. You cite sources, consider multiple perspectives, and acknowledge uncertainty. You organize findings clearly with summaries and key takeaways. You distinguish between facts, interpretations, and speculation. You flag when more research is needed.`,
    communicationStyle: 'Thorough, source-citing, presents findings in structured format with confidence levels.',
  },
];

export default function PersonaBuilder() {
  const {
    editingPersona,
    models,
    settings,
    createPersona,
    updatePersona,
    setShowPersonaBuilder,
  } = useCouncilStore();

  const isEditing = !!editingPersona;

  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [department, setDepartment] = useState('');
  const [avatarEmoji, setAvatarEmoji] = useState('👤');
  const [bio, setBio] = useState('');
  const [model, setModel] = useState(settings.defaultModel);
  const [temperature, setTemperature] = useState(settings.defaultTemperature);
  const [systemPrompt, setSystemPrompt] = useState('');
  const [communicationStyle, setCommunicationStyle] = useState('');
  const [behaviorRulesText, setBehaviorRulesText] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');

  // Populate form when editing
  useEffect(() => {
    if (editingPersona) {
      setName(editingPersona.name);
      setRole(editingPersona.role);
      setDepartment(editingPersona.department);
      setAvatarEmoji(editingPersona.avatarEmoji);
      setBio(editingPersona.bio);
      setModel(editingPersona.model);
      setTemperature(editingPersona.temperature);
      setSystemPrompt(editingPersona.systemPrompt);
      setCommunicationStyle(editingPersona.communicationStyle);
      setBehaviorRulesText(editingPersona.behaviorRules.join('\n'));
    }
  }, [editingPersona]);

  const applyTemplate = (templateName: string) => {
    const t = PERSONA_TEMPLATES.find(t => t.name === templateName);
    if (!t) return;
    setSelectedTemplate(templateName);
    setName(t.name);
    setRole(t.role);
    setDepartment(t.department);
    setAvatarEmoji(t.avatarEmoji);
    setBio(t.bio);
    setModel(t.model);
    setTemperature(t.temperature);
    setSystemPrompt(t.systemPrompt);
    setCommunicationStyle(t.communicationStyle);
    setBehaviorRulesText('');
  };

  const handleSave = async () => {
    if (!name.trim() || !role.trim() || !systemPrompt.trim()) return;

    const input: CreatePersonaInput = {
      name: name.trim(),
      role: role.trim(),
      department: department.trim(),
      avatarEmoji,
      bio: bio.trim(),
      model,
      temperature,
      systemPrompt: systemPrompt.trim(),
      communicationStyle: communicationStyle.trim(),
      behaviorRules: behaviorRulesText
        .split('\n')
        .map(r => r.trim())
        .filter(Boolean),
    };

    if (isEditing) {
      await updatePersona(editingPersona!.id, input);
    } else {
      await createPersona(input);
    }
  };

  const canSave = name.trim() && role.trim() && systemPrompt.trim();

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="w-[640px] max-h-[85vh] flex flex-col bg-[#16213e] rounded-lg border border-white/10 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/10 shrink-0">
          <h2 className="text-sm font-semibold text-surface-200">
            {isEditing ? 'Edit Persona' : 'Create Persona'}
          </h2>
          <button
            onClick={() => setShowPersonaBuilder(false)}
            className="text-surface-500 hover:text-surface-300 text-lg leading-none"
          >
            &times;
          </button>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 min-h-0">
          {/* Template selector */}
          {!isEditing && (
            <div>
              <label className="text-xs text-surface-400 mb-1 block">Quick Start Template</label>
              <select
                value={selectedTemplate}
                onChange={(e) => applyTemplate(e.target.value)}
                className="w-full bg-[var(--bg-input)] text-surface-200 text-sm rounded px-3 py-2 border border-white/10 focus:border-primary-500 focus:outline-none"
              >
                <option value="">Choose a template...</option>
                {PERSONA_TEMPLATES.map(t => (
                  <option key={t.name} value={t.name}>{t.avatarEmoji} {t.name} — {t.role}</option>
                ))}
              </select>
            </div>
          )}

          {/* Name + Role */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-surface-400 mb-1 block">Name *</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Morgan"
                className="w-full bg-[var(--bg-input)] text-surface-200 text-sm rounded px-3 py-2 border border-white/10 focus:border-primary-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-surface-400 mb-1 block">Role *</label>
              <input
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="e.g. Senior Developer"
                className="w-full bg-[var(--bg-input)] text-surface-200 text-sm rounded px-3 py-2 border border-white/10 focus:border-primary-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Department + Avatar */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-surface-400 mb-1 block">Department</label>
              <input
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="e.g. Engineering"
                className="w-full bg-[var(--bg-input)] text-surface-200 text-sm rounded px-3 py-2 border border-white/10 focus:border-primary-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-surface-400 mb-1 block">Avatar Emoji</label>
              <input
                value={avatarEmoji}
                onChange={(e) => setAvatarEmoji(e.target.value)}
                className="w-full bg-[var(--bg-input)] text-surface-200 text-sm rounded px-3 py-2 border border-white/10 focus:border-primary-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Bio */}
          <div>
            <label className="text-xs text-surface-400 mb-1 block">Bio</label>
            <input
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Short description of this persona"
              className="w-full bg-[var(--bg-input)] text-surface-200 text-sm rounded px-3 py-2 border border-white/10 focus:border-primary-500 focus:outline-none"
            />
          </div>

          {/* Model + Temperature */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-surface-400 mb-1 block">Model</label>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full bg-[var(--bg-input)] text-surface-200 text-sm rounded px-3 py-2 border border-white/10 focus:border-primary-500 focus:outline-none"
              >
                {models.map(m => (
                  <option key={m.id} value={m.id}>{m.name} ({m.provider})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-surface-400 mb-1 block">
                Temperature: {temperature.toFixed(1)}
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                className="w-full mt-2"
              />
              <div className="flex justify-between text-[10px] text-surface-600">
                <span>Precise</span>
                <span>Creative</span>
              </div>
            </div>
          </div>

          {/* System Prompt */}
          <div>
            <label className="text-xs text-surface-400 mb-1 block">System Prompt *</label>
            <textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              placeholder="Define this persona's identity, expertise, and behavior..."
              rows={6}
              className="w-full bg-[var(--bg-input)] text-surface-200 text-sm rounded px-3 py-2 border border-white/10 focus:border-primary-500 focus:outline-none resize-none"
            />
          </div>

          {/* Communication Style */}
          <div>
            <label className="text-xs text-surface-400 mb-1 block">Communication Style</label>
            <textarea
              value={communicationStyle}
              onChange={(e) => setCommunicationStyle(e.target.value)}
              placeholder="How does this persona communicate? (e.g. direct, uses examples, asks questions first)"
              rows={2}
              className="w-full bg-[var(--bg-input)] text-surface-200 text-sm rounded px-3 py-2 border border-white/10 focus:border-primary-500 focus:outline-none resize-none"
            />
          </div>

          {/* Behavior Rules */}
          <div>
            <label className="text-xs text-surface-400 mb-1 block">Behavior Rules (one per line)</label>
            <textarea
              value={behaviorRulesText}
              onChange={(e) => setBehaviorRulesText(e.target.value)}
              placeholder="Always cite sources when making claims&#10;Push back on unrealistic deadlines&#10;Ask clarifying questions before estimating"
              rows={3}
              className="w-full bg-[var(--bg-input)] text-surface-200 text-sm rounded px-3 py-2 border border-white/10 focus:border-primary-500 focus:outline-none resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-white/10 shrink-0">
          <button
            onClick={() => setShowPersonaBuilder(false)}
            className="px-4 py-1.5 text-sm text-surface-400 hover:text-surface-300 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!canSave}
            className={`px-4 py-1.5 text-sm rounded transition-colors ${
              canSave
                ? 'bg-primary-600 hover:bg-primary-500 text-white'
                : 'bg-surface-700 text-surface-500 cursor-not-allowed'
            }`}
          >
            {isEditing ? 'Save Changes' : 'Create Persona'}
          </button>
        </div>
      </div>
    </div>
  );
}
