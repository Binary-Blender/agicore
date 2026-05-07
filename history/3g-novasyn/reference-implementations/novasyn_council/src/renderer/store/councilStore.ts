import { create } from 'zustand';
import type { Persona, CreatePersonaInput, Settings, AIModel, SkillDoc, CreateSkillDocInput, Memory, CreateMemoryInput, ExtractedMemory, Conversation, ConversationMessage, SendMessageInput, Meeting, MeetingMessage, CreateMeetingInput, MeetingAnalysis, ActionItem, CreateActionItemInput, DecisionRecord, CreateDecisionRecordInput, Relationship, CreateRelationshipInput, SuggestedRelationship, SearchResult, CostAnalytics, MeetingVoteResult, Orchestration, OrchestrationStep } from '../../shared/types';

export type ViewType = 'dashboard' | 'persona' | 'meeting';

interface CouncilStore {
  // ── Data ──
  personas: Persona[];
  settings: Settings;
  apiKeys: Record<string, string>;
  models: AIModel[];

  // ── Current Selection ──
  currentPersona: Persona | null;
  skillDocs: SkillDoc[];
  memories: Memory[];
  conversations: Conversation[];
  currentConversation: Conversation | null;
  conversationMessages: ConversationMessage[];

  // ── Meetings ──
  meetings: Meeting[];
  currentMeeting: Meeting | null;
  meetingMessages: MeetingMessage[];
  meetingAnalysis: MeetingAnalysis | null;
  analyzingMeeting: boolean;
  meetingVoteResult: MeetingVoteResult | null;
  callingVote: boolean;
  actionItems: ActionItem[];
  decisionRecords: DecisionRecord[];

  // ── Relationships ──
  relationships: Relationship[];
  suggestedRelationships: SuggestedRelationship[];
  showRelationshipPanel: boolean;
  suggestingRelationships: boolean;

  // ── Analytics ──
  costAnalytics: CostAnalytics | null;
  showAnalytics: boolean;

  // ── Search ──
  searchResults: SearchResult[];
  showSearchPanel: boolean;
  searching: boolean;

  // ── Streaming ──
  streamingContent: string;
  streamingPersonaId: string | null;

  // ── UI State ──
  currentView: ViewType;
  showPersonaBuilder: boolean;
  showSettings: boolean;
  showSkillDocEditor: boolean;
  showMemoryEditor: boolean;
  editingPersona: Persona | null;
  editingSkillDoc: SkillDoc | null;
  editingMemory: Memory | null;
  memorySearchQuery: string;
  extractedMemories: ExtractedMemory[];
  showMemoryReview: boolean;
  extractingMemories: boolean;
  activePersonaTab: 'overview' | 'chat' | 'skilldocs' | 'memories';
  showMeetingCreator: boolean;
  meetingLoading: boolean;
  aiLoading: boolean;
  loading: boolean;

  // ── Initialization ──
  loadSettings: () => Promise<void>;
  loadApiKeys: () => Promise<void>;
  loadModels: () => Promise<void>;
  loadPersonas: () => Promise<void>;

  // ── Settings ──
  saveSettings: (updates: Partial<Settings>) => Promise<void>;

  // ── Persona Management ──
  selectPersona: (persona: Persona) => void;
  createPersona: (input: CreatePersonaInput) => Promise<void>;
  updatePersona: (id: string, updates: Partial<Persona>) => Promise<void>;
  deletePersona: (id: string) => Promise<void>;

  // ── Skill Docs ──
  loadSkillDocs: (personaId: string | null) => Promise<void>;
  createSkillDoc: (input: CreateSkillDocInput) => Promise<void>;
  updateSkillDoc: (id: string, updates: Partial<SkillDoc>) => Promise<void>;
  deleteSkillDoc: (id: string) => Promise<void>;

  // ── Memories ──
  loadMemories: (personaId: string | null) => Promise<void>;
  createMemory: (input: CreateMemoryInput) => Promise<void>;
  updateMemory: (id: string, updates: Partial<Memory>) => Promise<void>;
  deleteMemory: (id: string) => Promise<void>;
  searchMemories: (query: string) => Promise<void>;
  clearMemorySearch: () => void;
  extractMemoriesFromConversation: () => Promise<void>;
  acceptExtractedMemory: (memory: ExtractedMemory) => Promise<void>;
  dismissExtractedMemory: (index: number) => void;
  setShowMemoryReview: (show: boolean) => void;
  supersedeMemory: (oldId: string, newId: string) => Promise<void>;

  // ── Conversations ──
  loadConversations: (personaId: string) => Promise<void>;
  createConversation: (personaId: string) => Promise<void>;
  renameConversation: (id: string, title: string) => Promise<void>;
  selectConversation: (conversation: Conversation) => Promise<void>;
  deleteConversation: (id: string) => Promise<void>;
  sendMessage: (content: string) => Promise<void>;
  regenerateResponse: () => Promise<void>;
  exportConversation: () => Promise<void>;

  // ── Meetings ──
  loadMeetings: () => Promise<void>;
  createMeeting: (input: CreateMeetingInput) => Promise<void>;
  selectMeeting: (meeting: Meeting) => Promise<void>;
  deleteMeeting: (id: string) => Promise<void>;
  endMeeting: () => Promise<void>;
  sendMeetingMessage: (content: string) => Promise<void>;
  analyzeMeetingIntel: () => Promise<void>;
  clearMeetingAnalysis: () => void;
  callMeetingVote: (question: string) => Promise<void>;
  clearMeetingVote: () => void;
  exportMeeting: () => Promise<void>;
  setShowMeetingCreator: (show: boolean) => void;
  leaveMeeting: () => void;

  // ── Analytics ──
  loadCostAnalytics: () => Promise<void>;
  setShowAnalytics: (show: boolean) => void;

  // ── Search ──
  globalSearch: (query: string) => Promise<void>;
  setShowSearchPanel: (show: boolean) => void;

  // ── Relationships ──
  loadRelationships: (personaId: string) => Promise<void>;
  createRelationship: (input: CreateRelationshipInput) => Promise<void>;
  updateRelationship: (id: string, updates: Partial<Relationship>) => Promise<void>;
  deleteRelationship: (id: string) => Promise<void>;
  suggestRelationshipsFromMeeting: () => Promise<void>;
  acceptSuggestedRelationship: (suggestion: SuggestedRelationship) => Promise<void>;
  dismissSuggestedRelationship: (index: number) => void;
  setShowRelationshipPanel: (show: boolean) => void;

  // ── Action Items & Decisions ──
  loadActionItems: (meetingId?: string) => Promise<void>;
  createActionItem: (input: CreateActionItemInput) => Promise<void>;
  updateActionItem: (id: string, updates: Partial<ActionItem>) => Promise<void>;
  deleteActionItem: (id: string) => Promise<void>;
  loadDecisionRecords: (meetingId?: string) => Promise<void>;
  createDecisionRecord: (input: CreateDecisionRecordInput) => Promise<void>;
  deleteDecisionRecord: (id: string) => Promise<void>;

  // ── Orchestrations ──
  orchestrations: Orchestration[];
  loadOrchestrations: () => Promise<void>;
  createOrchestration: (data: { name: string; description?: string; steps: OrchestrationStep[] }) => Promise<Orchestration>;
  updateOrchestration: (id: string, updates: Partial<Orchestration>) => Promise<Orchestration>;
  deleteOrchestration: (id: string) => Promise<void>;

  // ── UI Navigation ──
  setCurrentView: (view: ViewType) => void;
  setShowPersonaBuilder: (show: boolean) => void;
  setShowSettings: (show: boolean) => void;
  setShowSkillDocEditor: (show: boolean) => void;
  setShowMemoryEditor: (show: boolean) => void;
  setEditingPersona: (persona: Persona | null) => void;
  setEditingSkillDoc: (doc: SkillDoc | null) => void;
  setEditingMemory: (memory: Memory | null) => void;
  setActivePersonaTab: (tab: 'overview' | 'chat' | 'skilldocs' | 'memories') => void;
}

export const useCouncilStore = create<CouncilStore>((set, get) => ({
  // ── Initial State ──
  personas: [],
  settings: { theme: 'dark', defaultModel: 'claude-sonnet-4-20250514', defaultTemperature: 0.7 },
  apiKeys: {},
  models: [],
  currentPersona: null,
  skillDocs: [],
  memories: [],
  conversations: [],
  currentConversation: null,
  conversationMessages: [],
  meetings: [],
  currentMeeting: null,
  meetingMessages: [],
  meetingAnalysis: null,
  analyzingMeeting: false,
  meetingVoteResult: null,
  callingVote: false,
  actionItems: [],
  decisionRecords: [],
  costAnalytics: null,
  showAnalytics: false,
  searchResults: [],
  showSearchPanel: false,
  searching: false,
  relationships: [],
  suggestedRelationships: [],
  showRelationshipPanel: false,
  suggestingRelationships: false,
  streamingContent: '',
  streamingPersonaId: null,
  currentView: 'dashboard',
  showPersonaBuilder: false,
  showSettings: false,
  showSkillDocEditor: false,
  showMemoryEditor: false,
  editingPersona: null,
  editingSkillDoc: null,
  editingMemory: null,
  memorySearchQuery: '',
  extractedMemories: [],
  showMemoryReview: false,
  extractingMemories: false,
  activePersonaTab: 'overview',
  showMeetingCreator: false,
  meetingLoading: false,
  aiLoading: false,
  loading: false,

  // ── Initialization ──

  loadSettings: async () => {
    try {
      const settings = await window.electronAPI.getSettings();
      set({ settings });
    } catch (e) { console.error('Failed to load settings:', e); }
  },

  loadApiKeys: async () => {
    try {
      const apiKeys = await window.electronAPI.getApiKeys();
      set({ apiKeys });
    } catch (e) { console.error('Failed to load API keys:', e); }
  },

  loadModels: async () => {
    try {
      const models = await window.electronAPI.getModels();
      set({ models });
    } catch (e) { console.error('Failed to load models:', e); }
  },

  loadPersonas: async () => {
    try {
      const personas = await window.electronAPI.getPersonas();
      set({ personas });
      // If current persona was deleted, clear it
      const { currentPersona } = get();
      if (currentPersona && !personas.find(p => p.id === currentPersona.id)) {
        set({ currentPersona: null, currentView: 'dashboard' });
      }
    } catch (e) { console.error('Failed to load personas:', e); }
  },

  // ── Settings ──

  saveSettings: async (updates) => {
    try {
      await window.electronAPI.saveSettings(updates);
      const { settings } = get();
      set({ settings: { ...settings, ...updates } });
    } catch (e) { console.error('Failed to save settings:', e); }
  },

  // ── Persona Management ──

  selectPersona: (persona) => {
    set({ currentPersona: persona, currentView: 'persona', activePersonaTab: 'overview', currentConversation: null, conversationMessages: [], memorySearchQuery: '' });
    get().loadSkillDocs(persona.id);
    get().loadMemories(persona.id);
    get().loadConversations(persona.id);
    get().loadRelationships(persona.id);
  },

  createPersona: async (input) => {
    try {
      await window.electronAPI.createPersona(input);
      await get().loadPersonas();
      set({ showPersonaBuilder: false, editingPersona: null });
    } catch (e) { console.error('Failed to create persona:', e); }
  },

  updatePersona: async (id, updates) => {
    try {
      const updated = await window.electronAPI.updatePersona(id, updates);
      await get().loadPersonas();
      // Update currentPersona if it's the one being edited
      const { currentPersona } = get();
      if (currentPersona?.id === id) {
        set({ currentPersona: updated });
      }
      set({ showPersonaBuilder: false, editingPersona: null });
    } catch (e) { console.error('Failed to update persona:', e); }
  },

  deletePersona: async (id) => {
    try {
      await window.electronAPI.deletePersona(id);
      const { currentPersona } = get();
      if (currentPersona?.id === id) {
        set({ currentPersona: null, currentView: 'dashboard' });
      }
      await get().loadPersonas();
    } catch (e) { console.error('Failed to delete persona:', e); }
  },

  // ── Skill Docs ──

  loadSkillDocs: async (personaId) => {
    try {
      const skillDocs = await window.electronAPI.getSkillDocs(personaId);
      set({ skillDocs });
    } catch (e) { console.error('Failed to load skill docs:', e); }
  },

  createSkillDoc: async (input) => {
    try {
      await window.electronAPI.createSkillDoc(input);
      const { currentPersona } = get();
      await get().loadSkillDocs(currentPersona?.id || null);
      set({ showSkillDocEditor: false, editingSkillDoc: null });
    } catch (e) { console.error('Failed to create skill doc:', e); }
  },

  updateSkillDoc: async (id, updates) => {
    try {
      await window.electronAPI.updateSkillDoc(id, updates);
      const { currentPersona } = get();
      await get().loadSkillDocs(currentPersona?.id || null);
      set({ showSkillDocEditor: false, editingSkillDoc: null });
    } catch (e) { console.error('Failed to update skill doc:', e); }
  },

  deleteSkillDoc: async (id) => {
    try {
      await window.electronAPI.deleteSkillDoc(id);
      const { currentPersona } = get();
      await get().loadSkillDocs(currentPersona?.id || null);
    } catch (e) { console.error('Failed to delete skill doc:', e); }
  },

  // ── Memories ──

  loadMemories: async (personaId) => {
    try {
      const memories = await window.electronAPI.getMemories(personaId);
      set({ memories });
    } catch (e) { console.error('Failed to load memories:', e); }
  },

  createMemory: async (input) => {
    try {
      await window.electronAPI.createMemory(input);
      const { currentPersona } = get();
      await get().loadMemories(currentPersona?.id || null);
      set({ showMemoryEditor: false, editingMemory: null });
    } catch (e) { console.error('Failed to create memory:', e); }
  },

  updateMemory: async (id, updates) => {
    try {
      await window.electronAPI.updateMemory(id, updates);
      const { currentPersona } = get();
      await get().loadMemories(currentPersona?.id || null);
      set({ showMemoryEditor: false, editingMemory: null });
    } catch (e) { console.error('Failed to update memory:', e); }
  },

  deleteMemory: async (id) => {
    try {
      await window.electronAPI.deleteMemory(id);
      const { currentPersona } = get();
      await get().loadMemories(currentPersona?.id || null);
    } catch (e) { console.error('Failed to delete memory:', e); }
  },

  searchMemories: async (query) => {
    try {
      const { currentPersona } = get();
      const memories = await window.electronAPI.searchMemories(currentPersona?.id || null, query);
      set({ memories, memorySearchQuery: query });
    } catch (e) { console.error('Failed to search memories:', e); }
  },

  clearMemorySearch: () => {
    const { currentPersona } = get();
    set({ memorySearchQuery: '' });
    if (currentPersona) {
      get().loadMemories(currentPersona.id);
    }
  },

  extractMemoriesFromConversation: async () => {
    const { currentConversation, currentPersona } = get();
    if (!currentConversation || !currentPersona) return;

    set({ extractingMemories: true });
    try {
      const extracted = await window.electronAPI.extractMemories(currentConversation.id, currentPersona.id);
      set({ extractedMemories: extracted, showMemoryReview: true, extractingMemories: false });
    } catch (e) {
      console.error('Failed to extract memories:', e);
      set({ extractingMemories: false });
    }
  },

  acceptExtractedMemory: async (memory) => {
    const { currentPersona } = get();
    try {
      await window.electronAPI.createMemory({
        personaId: currentPersona?.id || null,
        memoryType: memory.type,
        content: memory.content,
        sourceConversationId: get().currentConversation?.id,
        importance: memory.importance,
        relevanceTags: memory.relevanceTags,
      });
      // Remove from extracted list
      set(state => ({
        extractedMemories: state.extractedMemories.filter(m => m !== memory),
      }));
      // Reload memories
      await get().loadMemories(currentPersona?.id || null);
    } catch (e) {
      console.error('Failed to accept extracted memory:', e);
    }
  },

  dismissExtractedMemory: (index) => {
    set(state => ({
      extractedMemories: state.extractedMemories.filter((_, i) => i !== index),
    }));
  },

  setShowMemoryReview: (show) => {
    set({ showMemoryReview: show });
    if (!show) set({ extractedMemories: [] });
  },

  supersedeMemory: async (oldId, newId) => {
    try {
      await window.electronAPI.supersedeMemory(oldId, newId);
      const { currentPersona } = get();
      await get().loadMemories(currentPersona?.id || null);
    } catch (e) {
      console.error('Failed to supersede memory:', e);
    }
  },

  // ── Conversations ──

  loadConversations: async (personaId) => {
    try {
      const conversations = await window.electronAPI.getConversations(personaId);
      set({ conversations });
    } catch (e) { console.error('Failed to load conversations:', e); }
  },

  createConversation: async (personaId) => {
    try {
      const conversation = await window.electronAPI.createConversation(personaId);
      await get().loadConversations(personaId);
      set({ currentConversation: conversation, conversationMessages: [], activePersonaTab: 'chat' });
    } catch (e) { console.error('Failed to create conversation:', e); }
  },

  renameConversation: async (id, title) => {
    try {
      await window.electronAPI.renameConversation(id, title);
      const { currentConversation, currentPersona } = get();
      if (currentConversation?.id === id) {
        set({ currentConversation: { ...currentConversation, title } });
      }
      if (currentPersona) {
        await get().loadConversations(currentPersona.id);
      }
    } catch (e) { console.error('Failed to rename conversation:', e); }
  },

  selectConversation: async (conversation) => {
    try {
      set({ currentConversation: conversation, activePersonaTab: 'chat' });
      const messages = await window.electronAPI.getConversationMessages(conversation.id);
      set({ conversationMessages: messages });
    } catch (e) { console.error('Failed to load conversation messages:', e); }
  },

  deleteConversation: async (id) => {
    try {
      await window.electronAPI.deleteConversation(id);
      const { currentConversation, currentPersona } = get();
      if (currentConversation?.id === id) {
        set({ currentConversation: null, conversationMessages: [] });
      }
      if (currentPersona) {
        await get().loadConversations(currentPersona.id);
      }
    } catch (e) { console.error('Failed to delete conversation:', e); }
  },

  sendMessage: async (content) => {
    const { currentConversation, currentPersona } = get();
    if (!currentConversation || !currentPersona) return;

    // Optimistic: add user message immediately
    const tempUserMsg: ConversationMessage = {
      id: 'temp-user-' + Date.now(),
      conversationId: currentConversation.id,
      senderType: 'human',
      content,
      modelUsed: null,
      tokensIn: null,
      tokensOut: null,
      cost: null,
      responseTimeMs: null,
      skillDocsLoaded: [],
      memoriesLoaded: [],
      createdAt: new Date().toISOString(),
    };

    set(state => ({
      conversationMessages: [...state.conversationMessages, tempUserMsg],
      aiLoading: true,
      streamingContent: '',
    }));

    // Set up streaming listener
    const cleanupStream = window.electronAPI.onStreamChunk((text) => {
      set(state => ({ streamingContent: state.streamingContent + text }));
    });

    try {
      const result = await window.electronAPI.sendPersonaMessage({
        conversationId: currentConversation.id,
        personaId: currentPersona.id,
        content,
      });

      cleanupStream();

      // Replace temp message with real ones
      set(state => ({
        conversationMessages: [
          ...state.conversationMessages.filter(m => m.id !== tempUserMsg.id),
          result.userMessage,
          result.aiMessage,
        ],
        aiLoading: false,
        streamingContent: '',
      }));

      // Refresh conversations list (updated_at changed) and persona stats
      await get().loadConversations(currentPersona.id);
      await get().loadPersonas();
    } catch (e: any) {
      cleanupStream();
      console.error('Failed to send message:', e);
      // Remove temp message on error
      set(state => ({
        conversationMessages: state.conversationMessages.filter(m => m.id !== tempUserMsg.id),
        aiLoading: false,
        streamingContent: '',
      }));
      // Re-throw so the UI can show the error
      throw e;
    }
  },

  regenerateResponse: async () => {
    const { currentConversation, currentPersona, conversationMessages } = get();
    if (!currentConversation || !currentPersona) return;

    // Must have at least one AI message
    const lastAiMsg = [...conversationMessages].reverse().find(m => m.senderType === 'persona');
    if (!lastAiMsg) return;

    // Remove the last AI message from the UI optimistically
    set(state => ({
      conversationMessages: state.conversationMessages.filter(m => m.id !== lastAiMsg.id),
      aiLoading: true,
      streamingContent: '',
    }));

    // Set up streaming listener
    const cleanupStream = window.electronAPI.onStreamChunk((text) => {
      set(state => ({ streamingContent: state.streamingContent + text }));
    });

    try {
      const result = await window.electronAPI.regenerateResponse(
        currentConversation.id,
        currentPersona.id,
      );

      cleanupStream();

      // Replace with new AI message
      set(state => ({
        conversationMessages: [
          ...state.conversationMessages,
          result.aiMessage,
        ],
        aiLoading: false,
        streamingContent: '',
      }));

      await get().loadConversations(currentPersona.id);
      await get().loadPersonas();
    } catch (e: any) {
      cleanupStream();
      console.error('Failed to regenerate response:', e);
      // Re-add the original AI message on error
      set(state => ({
        conversationMessages: [...state.conversationMessages, lastAiMsg],
        aiLoading: false,
        streamingContent: '',
      }));
      throw e;
    }
  },

  exportConversation: async () => {
    const { currentConversation } = get();
    if (!currentConversation) return;
    try {
      await window.electronAPI.exportConversation(currentConversation.id);
    } catch (e) { console.error('Failed to export conversation:', e); }
  },

  // ── Meetings ──

  loadMeetings: async () => {
    try {
      const meetings = await window.electronAPI.getMeetings();
      set({ meetings });
    } catch (e) { console.error('Failed to load meetings:', e); }
  },

  createMeeting: async (input) => {
    try {
      const meeting = await window.electronAPI.createMeeting(input);
      await get().loadMeetings();
      set({ currentMeeting: meeting, meetingMessages: [], currentView: 'meeting', showMeetingCreator: false });
    } catch (e) { console.error('Failed to create meeting:', e); }
  },

  selectMeeting: async (meeting) => {
    try {
      set({ currentMeeting: meeting, currentView: 'meeting', meetingAnalysis: null });
      const messages = await window.electronAPI.getMeetingMessages(meeting.id);
      set({ meetingMessages: messages });
      // Load action items and decision records for this meeting
      get().loadActionItems(meeting.id);
      get().loadDecisionRecords(meeting.id);
    } catch (e) { console.error('Failed to load meeting messages:', e); }
  },

  deleteMeeting: async (id) => {
    try {
      await window.electronAPI.deleteMeeting(id);
      const { currentMeeting } = get();
      if (currentMeeting?.id === id) {
        set({ currentMeeting: null, meetingMessages: [], currentView: 'dashboard' });
      }
      await get().loadMeetings();
    } catch (e) { console.error('Failed to delete meeting:', e); }
  },

  endMeeting: async () => {
    const { currentMeeting } = get();
    if (!currentMeeting) return;
    try {
      await window.electronAPI.endMeeting(currentMeeting.id);
      set(state => ({
        currentMeeting: state.currentMeeting ? { ...state.currentMeeting, status: 'completed' as const } : null,
      }));
      await get().loadMeetings();
    } catch (e) { console.error('Failed to end meeting:', e); }
  },

  sendMeetingMessage: async (content) => {
    const { currentMeeting } = get();
    if (!currentMeeting || currentMeeting.status !== 'active') return;

    // Optimistic: add user message
    const tempUserMsg: MeetingMessage = {
      id: 'temp-user-' + Date.now(),
      meetingId: currentMeeting.id,
      senderType: 'human',
      senderPersonaId: null,
      content,
      modelUsed: null,
      tokensIn: null,
      tokensOut: null,
      cost: null,
      responseTimeMs: null,
      skillDocsLoaded: [],
      memoriesLoaded: [],
      createdAt: new Date().toISOString(),
    };

    set(state => ({
      meetingMessages: [...state.meetingMessages, tempUserMsg],
      meetingLoading: true,
      streamingContent: '',
      streamingPersonaId: null,
    }));

    // Set up streaming listeners
    const cleanupChunk = window.electronAPI.onStreamChunk((text) => {
      set(state => ({ streamingContent: state.streamingContent + text }));
    });
    const cleanupPersonaStart = window.electronAPI.onStreamPersonaStart((personaId) => {
      set({ streamingPersonaId: personaId, streamingContent: '' });
    });

    try {
      const result = await window.electronAPI.sendMeetingMessage({
        meetingId: currentMeeting.id,
        content,
      });

      cleanupChunk();
      cleanupPersonaStart();

      // Replace temp message with real ones
      set(state => ({
        meetingMessages: [
          ...state.meetingMessages.filter(m => m.id !== tempUserMsg.id),
          result.userMessage,
          ...result.personaMessages,
        ],
        meetingLoading: false,
        streamingContent: '',
        streamingPersonaId: null,
      }));

      // Refresh meetings list and persona stats
      await get().loadMeetings();
      await get().loadPersonas();
    } catch (e: any) {
      cleanupChunk();
      cleanupPersonaStart();
      console.error('Failed to send meeting message:', e);
      set(state => ({
        meetingMessages: state.meetingMessages.filter(m => m.id !== tempUserMsg.id),
        meetingLoading: false,
        streamingContent: '',
        streamingPersonaId: null,
      }));
      throw e;
    }
  },

  analyzeMeetingIntel: async () => {
    const { currentMeeting } = get();
    if (!currentMeeting) return;

    set({ analyzingMeeting: true });
    try {
      const analysis = await window.electronAPI.analyzeMeeting(currentMeeting.id);
      set({ meetingAnalysis: analysis, analyzingMeeting: false });
    } catch (e) {
      console.error('Failed to analyze meeting:', e);
      set({ analyzingMeeting: false });
    }
  },

  clearMeetingAnalysis: () => set({ meetingAnalysis: null }),

  callMeetingVote: async (question) => {
    const { currentMeeting } = get();
    if (!currentMeeting) return;

    set({ callingVote: true });
    try {
      const result = await window.electronAPI.callMeetingVote(currentMeeting.id, question);
      set({ meetingVoteResult: result, callingVote: false });
    } catch (e) {
      console.error('Failed to call vote:', e);
      set({ callingVote: false });
    }
  },

  clearMeetingVote: () => set({ meetingVoteResult: null }),

  exportMeeting: async () => {
    const { currentMeeting } = get();
    if (!currentMeeting) return;
    try {
      await window.electronAPI.exportMeeting(currentMeeting.id);
    } catch (e) { console.error('Failed to export meeting:', e); }
  },

  setShowMeetingCreator: (show) => set({ showMeetingCreator: show }),

  leaveMeeting: () => {
    set({ currentMeeting: null, meetingMessages: [], meetingAnalysis: null, meetingVoteResult: null, actionItems: [], decisionRecords: [], currentView: 'dashboard' });
  },

  // ── Analytics ──

  loadCostAnalytics: async () => {
    try {
      const costAnalytics = await window.electronAPI.getCostAnalytics();
      set({ costAnalytics });
    } catch (e) { console.error('Failed to load cost analytics:', e); }
  },

  setShowAnalytics: (show) => {
    set({ showAnalytics: show });
    if (show) get().loadCostAnalytics();
  },

  // ── Search ──

  globalSearch: async (query) => {
    if (!query || query.trim().length < 2) {
      set({ searchResults: [], searching: false });
      return;
    }
    set({ searching: true });
    try {
      const results = await window.electronAPI.globalSearch(query);
      set({ searchResults: results, searching: false });
    } catch (e) {
      console.error('Failed to search:', e);
      set({ searching: false });
    }
  },

  setShowSearchPanel: (show) => {
    set({ showSearchPanel: show });
    if (!show) set({ searchResults: [], searching: false });
  },

  // ── Relationships ──

  loadRelationships: async (personaId) => {
    try {
      const relationships = await window.electronAPI.getRelationships(personaId);
      set({ relationships });
    } catch (e) { console.error('Failed to load relationships:', e); }
  },

  createRelationship: async (input) => {
    try {
      await window.electronAPI.createRelationship(input);
      // Reload for the current persona
      const { currentPersona } = get();
      if (currentPersona) {
        await get().loadRelationships(currentPersona.id);
      }
    } catch (e) { console.error('Failed to create relationship:', e); }
  },

  updateRelationship: async (id, updates) => {
    try {
      await window.electronAPI.updateRelationship(id, updates);
      const { currentPersona } = get();
      if (currentPersona) {
        await get().loadRelationships(currentPersona.id);
      }
    } catch (e) { console.error('Failed to update relationship:', e); }
  },

  deleteRelationship: async (id) => {
    try {
      await window.electronAPI.deleteRelationship(id);
      const { currentPersona } = get();
      if (currentPersona) {
        await get().loadRelationships(currentPersona.id);
      }
    } catch (e) { console.error('Failed to delete relationship:', e); }
  },

  suggestRelationshipsFromMeeting: async () => {
    const { currentMeeting } = get();
    if (!currentMeeting) return;

    set({ suggestingRelationships: true });
    try {
      const suggestions = await window.electronAPI.suggestRelationships(currentMeeting.id);
      set({ suggestedRelationships: suggestions, suggestingRelationships: false });
    } catch (e) {
      console.error('Failed to suggest relationships:', e);
      set({ suggestingRelationships: false });
    }
  },

  acceptSuggestedRelationship: async (suggestion) => {
    try {
      await window.electronAPI.createRelationship({
        personaId: suggestion.personaId,
        relatedPersonaId: suggestion.relatedPersonaId,
        relationshipType: suggestion.relationshipType,
        description: suggestion.description,
        dynamic: suggestion.dynamic,
        strength: suggestion.strength,
      });
      // Remove from suggestions
      set(state => ({
        suggestedRelationships: state.suggestedRelationships.filter(s => s !== suggestion),
      }));
      // Reload relationships if we're viewing a persona
      const { currentPersona } = get();
      if (currentPersona) {
        await get().loadRelationships(currentPersona.id);
      }
    } catch (e) { console.error('Failed to accept suggested relationship:', e); }
  },

  dismissSuggestedRelationship: (index) => {
    set(state => ({
      suggestedRelationships: state.suggestedRelationships.filter((_, i) => i !== index),
    }));
  },

  setShowRelationshipPanel: (show) => {
    set({ showRelationshipPanel: show });
    if (!show) set({ suggestedRelationships: [] });
  },

  // ── Action Items & Decisions ──

  loadActionItems: async (meetingId) => {
    try {
      const actionItems = await window.electronAPI.getActionItems(meetingId);
      set({ actionItems });
    } catch (e) { console.error('Failed to load action items:', e); }
  },

  createActionItem: async (input) => {
    try {
      await window.electronAPI.createActionItem(input);
      // Reload: if we're in a meeting context, load for that meeting; otherwise load all
      const { currentMeeting } = get();
      await get().loadActionItems(currentMeeting?.id);
    } catch (e) { console.error('Failed to create action item:', e); }
  },

  updateActionItem: async (id, updates) => {
    try {
      await window.electronAPI.updateActionItem(id, updates);
      const { currentMeeting } = get();
      await get().loadActionItems(currentMeeting?.id);
    } catch (e) { console.error('Failed to update action item:', e); }
  },

  deleteActionItem: async (id) => {
    try {
      await window.electronAPI.deleteActionItem(id);
      const { currentMeeting } = get();
      await get().loadActionItems(currentMeeting?.id);
    } catch (e) { console.error('Failed to delete action item:', e); }
  },

  loadDecisionRecords: async (meetingId) => {
    try {
      const decisionRecords = await window.electronAPI.getDecisionRecords(meetingId);
      set({ decisionRecords });
    } catch (e) { console.error('Failed to load decision records:', e); }
  },

  createDecisionRecord: async (input) => {
    try {
      await window.electronAPI.createDecisionRecord(input);
      const { currentMeeting } = get();
      await get().loadDecisionRecords(currentMeeting?.id);
    } catch (e) { console.error('Failed to create decision record:', e); }
  },

  deleteDecisionRecord: async (id) => {
    try {
      await window.electronAPI.deleteDecisionRecord(id);
      const { currentMeeting } = get();
      await get().loadDecisionRecords(currentMeeting?.id);
    } catch (e) { console.error('Failed to delete decision record:', e); }
  },

  // ── UI Navigation ──

  // Orchestrations
  orchestrations: [],
  loadOrchestrations: async () => {
    const orchestrations = await window.electronAPI.orchList();
    set({ orchestrations });
  },
  createOrchestration: async (data) => {
    const orch = await window.electronAPI.orchCreate(data);
    set({ orchestrations: [orch, ...get().orchestrations] });
    return orch;
  },
  updateOrchestration: async (id, updates) => {
    const orch = await window.electronAPI.orchUpdate(id, updates);
    set({ orchestrations: get().orchestrations.map((o) => (o.id === id ? orch : o)) });
    return orch;
  },
  deleteOrchestration: async (id) => {
    await window.electronAPI.orchDelete(id);
    set({ orchestrations: get().orchestrations.filter((o) => o.id !== id) });
  },

  setCurrentView: (view) => set({ currentView: view }),
  setShowPersonaBuilder: (show) => set({ showPersonaBuilder: show, editingPersona: show ? get().editingPersona : null }),
  setShowSettings: (show) => set({ showSettings: show }),
  setShowSkillDocEditor: (show) => set({ showSkillDocEditor: show, editingSkillDoc: show ? get().editingSkillDoc : null }),
  setShowMemoryEditor: (show) => set({ showMemoryEditor: show, editingMemory: show ? get().editingMemory : null }),
  setEditingPersona: (persona) => set({ editingPersona: persona }),
  setEditingSkillDoc: (doc) => set({ editingSkillDoc: doc }),
  setEditingMemory: (memory) => set({ editingMemory: memory }),
  setActivePersonaTab: (tab) => {
    set({ activePersonaTab: tab });
    // When switching to chat, clear conversation selection if none active
  },
}));
