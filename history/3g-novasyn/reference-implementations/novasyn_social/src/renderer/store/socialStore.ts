import { create } from 'zustand';
import type {
  Message,
  Account,
  SpcMetric,
  AutomationTierEntry,
  SyncStatus,
  InboxStats,
  SocialSettings,
  AIModel,
  MessageFilters,
  CreateMessageInput,
  CreateAccountInput,
  CreateFeedbackInput,
  CreateKBEntryInput,
  SendDraftInput,
  KBEntry,
  KBFilters,
  ResponseMode,
  Orchestration,
  OrchestrationStep,
} from '../../shared/types';

function getProviderForModel(modelId: string, models: AIModel[]): string {
  const model = models.find((m) => m.id === modelId);
  return model?.provider || 'anthropic';
}

type ViewType = 'dashboard' | 'inbox' | 'message-detail' | 'accounts' | 'spc' | 'knowledge-base' | 'settings';

interface SocialState {
  // UI
  currentView: ViewType;
  selectedMessageId: string | null;
  inboxFilters: MessageFilters;

  // Data
  messages: Message[];
  accounts: Account[];
  spcMetrics: SpcMetric[];
  automationTiers: AutomationTierEntry[];
  inboxStats: InboxStats | null;

  // Settings
  settings: SocialSettings;
  apiKeys: Record<string, string>;
  models: AIModel[];

  // UI state
  isLoading: boolean;

  // AI state
  isClassifying: boolean;
  isGenerating: boolean;
  streamedText: string;
  selectedModel: string;

  // SPC state
  redlineTopics: string[];
  isRecalculating: boolean;

  // Sync state
  syncStatuses: SyncStatus[];
  autoSyncEnabled: boolean;

  // Knowledge Base state
  kbEntries: KBEntry[];
  kbSearchResults: KBEntry[];
  isEmbedding: boolean;

  // Navigation
  setCurrentView: (view: ViewType) => void;
  selectMessage: (id: string | null) => void;
  setInboxFilters: (filters: MessageFilters) => void;

  // Data actions
  loadMessages: () => Promise<void>;
  loadMessage: (id: string) => Promise<Message | null>;
  createMessage: (input: CreateMessageInput) => Promise<void>;
  updateMessage: (id: string, updates: Partial<Message>) => Promise<void>;
  deleteMessage: (id: string) => Promise<void>;
  searchMessages: (query: string) => Promise<void>;

  loadAccounts: () => Promise<void>;
  createAccount: (input: CreateAccountInput) => Promise<void>;
  deleteAccount: (id: string) => Promise<void>;

  loadInboxStats: () => Promise<void>;
  loadSpcMetrics: () => Promise<void>;
  loadAutomationTiers: () => Promise<void>;

  // Settings actions
  loadSettings: () => Promise<void>;
  saveSettings: (settings: Partial<SocialSettings>) => Promise<void>;
  loadApiKeys: () => Promise<void>;
  setApiKey: (provider: string, key: string) => Promise<void>;
  loadModels: () => Promise<void>;

  // AI actions
  setSelectedModel: (modelId: string) => void;
  classifyMessage: (messageId: string) => Promise<void>;
  generateDraft: (messageId: string, responseMode: ResponseMode) => Promise<void>;
  stopGeneration: () => void;

  // Feedback
  submitFeedback: (input: CreateFeedbackInput) => Promise<void>;

  // Send
  sendDraft: (input: SendDraftInput) => Promise<{ sent: boolean; error?: string }>;
  getAutomationTierFor: (channelType: string, responseMode: string) => Promise<AutomationTierEntry | null>;

  // SPC actions
  calculateSpcMetrics: () => Promise<void>;
  updateAutomationTier: (channelType: string, responseMode: string, tier: number, reason?: string) => Promise<void>;
  loadRedlineTopics: () => Promise<void>;
  saveRedlineTopics: (topics: string[]) => Promise<void>;

  // Sync actions
  connectPlatform: (platform: string) => Promise<void>;
  disconnectAccount: (id: string) => Promise<void>;
  syncAccount: (accountId: string) => Promise<void>;
  syncAll: () => Promise<void>;
  loadSyncStatuses: () => Promise<void>;
  setAutoSync: (enabled: boolean, intervalMinutes?: number) => Promise<void>;

  // Export actions
  exportMessagesCsv: () => Promise<string | null>;
  exportSpcJson: () => Promise<string | null>;

  // Knowledge Base actions
  loadKBEntries: (filters?: KBFilters) => Promise<void>;
  createKBEntry: (input: CreateKBEntryInput) => Promise<void>;
  updateKBEntry: (id: string, updates: Partial<CreateKBEntryInput> & { isActive?: boolean }) => Promise<void>;
  deleteKBEntry: (id: string) => Promise<void>;
  searchKB: (query: string, channelType?: string, responseMode?: string) => Promise<void>;
  embedKBEntries: () => Promise<{ embedded: number } | null>;

  // Orchestrations
  orchestrations: Orchestration[];
  loadOrchestrations: () => Promise<void>;
  createOrchestration: (data: { name: string; description?: string; steps: OrchestrationStep[] }) => Promise<Orchestration>;
  updateOrchestration: (id: string, updates: Partial<Orchestration>) => Promise<Orchestration>;
  deleteOrchestration: (id: string) => Promise<void>;

  // Init
  loadInitialData: () => Promise<void>;
}

function isError(result: unknown): result is { error: string } {
  return result !== null && typeof result === 'object' && 'error' in (result as Record<string, unknown>);
}

export const useSocialStore = create<SocialState>((set, get) => ({
  // UI
  currentView: 'dashboard',
  selectedMessageId: null,
  inboxFilters: {},

  // Data
  messages: [],
  accounts: [],
  spcMetrics: [],
  automationTiers: [],
  inboxStats: null,

  // Settings
  settings: {
    theme: 'dark',
    defaultModel: '',
    autoClassify: true,
    defaultResponseMode: 'standard',
    notificationsEnabled: false,
  },
  apiKeys: {},
  models: [],

  // UI state
  isLoading: false,

  // AI state
  isClassifying: false,
  isGenerating: false,
  streamedText: '',
  selectedModel: 'claude-3-5-sonnet-20241022',

  // SPC state
  redlineTopics: [],
  isRecalculating: false,

  // Sync state
  syncStatuses: [],
  autoSyncEnabled: false,

  // Knowledge Base state
  kbEntries: [],
  kbSearchResults: [],
  isEmbedding: false,

  // Navigation
  setCurrentView: (view) => set({ currentView: view }),
  selectMessage: (id) => set({ selectedMessageId: id }),
  setInboxFilters: (filters) => set({ inboxFilters: filters }),

  // Data actions
  loadMessages: async () => {
    set({ isLoading: true });
    try {
      const result = await window.electronAPI.getMessages(get().inboxFilters);
      if (isError(result)) {
        console.error('Failed to load messages:', result.error);
        return;
      }
      set({ messages: result });
    } catch (err) {
      console.error('Failed to load messages:', err);
    } finally {
      set({ isLoading: false });
    }
  },

  loadMessage: async (id) => {
    try {
      const result = await window.electronAPI.getMessage(id);
      if (isError(result)) {
        console.error('Failed to load message:', result.error);
        return null;
      }
      // Update the message in the local list if it exists
      set((state) => ({
        messages: state.messages.map((m) => (m.id === id ? result : m)),
      }));
      return result;
    } catch (err) {
      console.error('Failed to load message:', err);
      return null;
    }
  },

  createMessage: async (input) => {
    try {
      const result = await window.electronAPI.createMessage(input);
      if (isError(result)) {
        console.error('Failed to create message:', result.error);
        return;
      }
      await get().loadMessages();
      await get().loadInboxStats();
    } catch (err) {
      console.error('Failed to create message:', err);
    }
  },

  updateMessage: async (id, updates) => {
    try {
      const result = await window.electronAPI.updateMessage(id, updates);
      if (isError(result)) {
        console.error('Failed to update message:', result.error);
        return;
      }
      set((state) => ({
        messages: state.messages.map((m) => (m.id === id ? { ...m, ...updates } : m)),
      }));
      await get().loadInboxStats();
    } catch (err) {
      console.error('Failed to update message:', err);
    }
  },

  deleteMessage: async (id) => {
    try {
      const result = await window.electronAPI.deleteMessage(id);
      if (isError(result)) {
        console.error('Failed to delete message:', result.error);
        return;
      }
      set((state) => ({
        messages: state.messages.filter((m) => m.id !== id),
        selectedMessageId: state.selectedMessageId === id ? null : state.selectedMessageId,
      }));
      await get().loadInboxStats();
    } catch (err) {
      console.error('Failed to delete message:', err);
    }
  },

  searchMessages: async (query) => {
    set({ isLoading: true });
    try {
      const result = await window.electronAPI.searchMessages(query);
      if (isError(result)) {
        console.error('Failed to search messages:', result.error);
        return;
      }
      set({ messages: result });
    } catch (err) {
      console.error('Failed to search messages:', err);
    } finally {
      set({ isLoading: false });
    }
  },

  loadAccounts: async () => {
    try {
      const result = await window.electronAPI.getAccounts();
      if (isError(result)) {
        console.error('Failed to load accounts:', result.error);
        return;
      }
      set({ accounts: result });
    } catch (err) {
      console.error('Failed to load accounts:', err);
    }
  },

  createAccount: async (input) => {
    try {
      const result = await window.electronAPI.createAccount(input);
      if (isError(result)) {
        console.error('Failed to create account:', result.error);
        return;
      }
      await get().loadAccounts();
    } catch (err) {
      console.error('Failed to create account:', err);
    }
  },

  deleteAccount: async (id) => {
    try {
      const result = await window.electronAPI.deleteAccount(id);
      if (isError(result)) {
        console.error('Failed to delete account:', result.error);
        return;
      }
      set((state) => ({
        accounts: state.accounts.filter((a) => a.id !== id),
      }));
    } catch (err) {
      console.error('Failed to delete account:', err);
    }
  },

  loadInboxStats: async () => {
    try {
      const result = await window.electronAPI.getInboxStats();
      if (isError(result)) {
        console.error('Failed to load inbox stats:', result.error);
        return;
      }
      set({ inboxStats: result });
    } catch (err) {
      console.error('Failed to load inbox stats:', err);
    }
  },

  loadSpcMetrics: async () => {
    try {
      const result = await window.electronAPI.getSpcMetrics();
      if (isError(result)) {
        console.error('Failed to load SPC metrics:', result.error);
        return;
      }
      set({ spcMetrics: result });
    } catch (err) {
      console.error('Failed to load SPC metrics:', err);
    }
  },

  loadAutomationTiers: async () => {
    try {
      const result = await window.electronAPI.getAutomationTiers();
      if (isError(result)) {
        console.error('Failed to load automation tiers:', result.error);
        return;
      }
      set({ automationTiers: result });
    } catch (err) {
      console.error('Failed to load automation tiers:', err);
    }
  },

  // Settings actions
  loadSettings: async () => {
    try {
      const result = await window.electronAPI.getSettings();
      if (isError(result)) {
        console.error('Failed to load settings:', result.error);
        return;
      }
      set({ settings: result });
    } catch (err) {
      console.error('Failed to load settings:', err);
    }
  },

  saveSettings: async (updates) => {
    try {
      const merged = { ...get().settings, ...updates };
      const result = await window.electronAPI.saveSettings(merged);
      if (isError(result)) {
        console.error('Failed to save settings:', result.error);
        return;
      }
      set({ settings: merged });
    } catch (err) {
      console.error('Failed to save settings:', err);
    }
  },

  loadApiKeys: async () => {
    try {
      const result = await window.electronAPI.getApiKeys();
      if (isError(result)) {
        console.error('Failed to load API keys:', result.error);
        return;
      }
      set({ apiKeys: result });
    } catch (err) {
      console.error('Failed to load API keys:', err);
    }
  },

  setApiKey: async (provider, key) => {
    try {
      const result = await window.electronAPI.setApiKey(provider, key);
      if (isError(result)) {
        console.error('Failed to set API key:', result.error);
        return;
      }
      set((state) => ({
        apiKeys: { ...state.apiKeys, [provider]: key },
      }));
    } catch (err) {
      console.error('Failed to set API key:', err);
    }
  },

  loadModels: async () => {
    try {
      const result = await window.electronAPI.getModels();
      if (isError(result)) {
        console.error('Failed to load models:', result.error);
        return;
      }
      set({ models: result });
    } catch (err) {
      console.error('Failed to load models:', err);
    }
  },

  // AI actions
  setSelectedModel: (modelId) => set({ selectedModel: modelId }),

  classifyMessage: async (messageId) => {
    set({ isClassifying: true });
    try {
      const modelId = get().selectedModel;
      const result = await window.electronAPI.classifyMessage(messageId, modelId);
      if (isError(result)) {
        console.error('Failed to classify message:', result.error);
        return;
      }
      // Reload the message to get the classification
      await get().loadMessage(messageId);
    } catch (err) {
      console.error('Failed to classify message:', err);
    } finally {
      set({ isClassifying: false });
    }
  },

  generateDraft: async (messageId, responseMode) => {
    set({ isGenerating: true, streamedText: '' });
    try {
      const modelId = get().selectedModel;

      // Set up streaming listeners
      window.electronAPI.onStreamChunk((chunk) => {
        set((state) => ({ streamedText: state.streamedText + chunk }));
      });
      window.electronAPI.onStreamDone(() => {
        set({ isGenerating: false });
        window.electronAPI.removeStreamListeners();
      });

      const result = await window.electronAPI.generateDraft(messageId, responseMode, modelId);
      if (isError(result)) {
        console.error('Failed to generate draft:', result.error);
        set({ isGenerating: false });
        window.electronAPI.removeStreamListeners();
        return;
      }
      // Reload the message to get updated drafts list
      await get().loadMessage(messageId);
    } catch (err) {
      console.error('Failed to generate draft:', err);
      set({ isGenerating: false });
      window.electronAPI.removeStreamListeners();
    }
  },

  stopGeneration: () => {
    window.electronAPI.aiStopGeneration();
    set({ isGenerating: false });
    window.electronAPI.removeStreamListeners();
  },

  // Feedback
  submitFeedback: async (input) => {
    try {
      const result = await window.electronAPI.submitFeedback(input);
      if (isError(result)) {
        console.error('Failed to submit feedback:', result.error);
        return;
      }
      // Reload SPC data since feedback triggers recalculation
      await Promise.all([get().loadSpcMetrics(), get().loadAutomationTiers()]);
    } catch (err) {
      console.error('Failed to submit feedback:', err);
    }
  },

  // Send
  sendDraft: async (input) => {
    try {
      const result = await window.electronAPI.sendDraft(input);
      if (result.sent) {
        // Reload SPC data since send triggers feedback + recalculation
        await Promise.all([get().loadSpcMetrics(), get().loadAutomationTiers()]);
      }
      return result;
    } catch (err: any) {
      console.error('Failed to send draft:', err);
      return { sent: false, error: err.message };
    }
  },

  getAutomationTierFor: async (channelType, responseMode) => {
    try {
      return await window.electronAPI.getAutomationTierFor(channelType, responseMode);
    } catch (err) {
      console.error('Failed to get automation tier:', err);
      return null;
    }
  },

  // SPC actions
  calculateSpcMetrics: async () => {
    set({ isRecalculating: true });
    try {
      const result = await window.electronAPI.calculateSpcMetrics();
      if (isError(result)) {
        console.error('Failed to calculate SPC metrics:', result.error);
        return;
      }
      await Promise.all([get().loadSpcMetrics(), get().loadAutomationTiers()]);
    } catch (err) {
      console.error('Failed to calculate SPC metrics:', err);
    } finally {
      set({ isRecalculating: false });
    }
  },

  updateAutomationTier: async (channelType, responseMode, tier, reason) => {
    try {
      const result = await window.electronAPI.updateAutomationTier(channelType, responseMode, tier, reason);
      if (isError(result)) {
        console.error('Failed to update automation tier:', result.error);
        return;
      }
      await get().loadAutomationTiers();
    } catch (err) {
      console.error('Failed to update automation tier:', err);
    }
  },

  loadRedlineTopics: async () => {
    try {
      const result = await window.electronAPI.getRedlineTopics();
      if (isError(result)) {
        console.error('Failed to load redline topics:', result.error);
        return;
      }
      set({ redlineTopics: result });
    } catch (err) {
      console.error('Failed to load redline topics:', err);
    }
  },

  saveRedlineTopics: async (topics) => {
    try {
      const result = await window.electronAPI.saveRedlineTopics(topics);
      if (isError(result)) {
        console.error('Failed to save redline topics:', result.error);
        return;
      }
      set({ redlineTopics: topics });
    } catch (err) {
      console.error('Failed to save redline topics:', err);
    }
  },

  // Sync actions
  connectPlatform: async (platform) => {
    try {
      const result = await window.electronAPI.connectPlatform(platform);
      if (isError(result)) {
        console.error('Failed to connect platform:', result.error);
        return;
      }
      await get().loadAccounts();
    } catch (err) {
      console.error('Failed to connect platform:', err);
    }
  },

  disconnectAccount: async (id) => {
    try {
      const result = await window.electronAPI.disconnectAccount(id);
      if (isError(result)) {
        console.error('Failed to disconnect account:', result.error);
        return;
      }
      await get().loadAccounts();
    } catch (err) {
      console.error('Failed to disconnect account:', err);
    }
  },

  syncAccount: async (accountId) => {
    try {
      const result = await window.electronAPI.syncAccount(accountId);
      if (isError(result)) {
        console.error('Failed to sync account:', result.error);
        return;
      }
      await Promise.all([
        get().loadAccounts(),
        get().loadMessages(),
        get().loadInboxStats(),
        get().loadSyncStatuses(),
      ]);
    } catch (err) {
      console.error('Failed to sync account:', err);
    }
  },

  syncAll: async () => {
    try {
      const result = await window.electronAPI.syncAll();
      if (isError(result)) {
        console.error('Failed to sync all:', result.error);
        return;
      }
      await Promise.all([
        get().loadAccounts(),
        get().loadMessages(),
        get().loadInboxStats(),
        get().loadSyncStatuses(),
      ]);
    } catch (err) {
      console.error('Failed to sync all:', err);
    }
  },

  loadSyncStatuses: async () => {
    try {
      const result = await window.electronAPI.getSyncStatus();
      if (isError(result)) {
        console.error('Failed to load sync statuses:', result.error);
        return;
      }
      set({ syncStatuses: result });
    } catch (err) {
      console.error('Failed to load sync statuses:', err);
    }
  },

  setAutoSync: async (enabled, intervalMinutes) => {
    try {
      const result = await window.electronAPI.setAutoSync(enabled, intervalMinutes);
      if (isError(result)) {
        console.error('Failed to set auto-sync:', result.error);
        return;
      }
      set({ autoSyncEnabled: enabled });
    } catch (err) {
      console.error('Failed to set auto-sync:', err);
    }
  },

  // Export actions
  exportMessagesCsv: async () => {
    try {
      const result = await window.electronAPI.exportMessagesCsv();
      if (result && 'path' in result) return result.path;
      return null;
    } catch (err) {
      console.error('Failed to export messages:', err);
      return null;
    }
  },

  exportSpcJson: async () => {
    try {
      const result = await window.electronAPI.exportSpcJson();
      if (result && 'path' in result) return result.path;
      return null;
    } catch (err) {
      console.error('Failed to export SPC report:', err);
      return null;
    }
  },

  // Knowledge Base actions
  loadKBEntries: async (filters) => {
    try {
      const result = await window.electronAPI.getKBEntries(filters);
      if (isError(result)) {
        console.error('Failed to load KB entries:', result.error);
        return;
      }
      set({ kbEntries: result });
    } catch (err) {
      console.error('Failed to load KB entries:', err);
    }
  },

  createKBEntry: async (input) => {
    try {
      const result = await window.electronAPI.createKBEntry(input);
      if (isError(result)) {
        console.error('Failed to create KB entry:', result.error);
        return;
      }
      await get().loadKBEntries();
    } catch (err) {
      console.error('Failed to create KB entry:', err);
    }
  },

  updateKBEntry: async (id, updates) => {
    try {
      const result = await window.electronAPI.updateKBEntry(id, updates);
      if (isError(result)) {
        console.error('Failed to update KB entry:', result.error);
        return;
      }
      await get().loadKBEntries();
    } catch (err) {
      console.error('Failed to update KB entry:', err);
    }
  },

  deleteKBEntry: async (id) => {
    try {
      const result = await window.electronAPI.deleteKBEntry(id);
      if (isError(result)) {
        console.error('Failed to delete KB entry:', result.error);
        return;
      }
      set((state) => ({
        kbEntries: state.kbEntries.filter((e) => e.id !== id),
      }));
    } catch (err) {
      console.error('Failed to delete KB entry:', err);
    }
  },

  searchKB: async (query, channelType, responseMode) => {
    try {
      const result = await window.electronAPI.searchKB(query, channelType, responseMode);
      if (isError(result)) {
        console.error('Failed to search KB:', result.error);
        return;
      }
      set({ kbSearchResults: result });
    } catch (err) {
      console.error('Failed to search KB:', err);
    }
  },

  embedKBEntries: async () => {
    set({ isEmbedding: true });
    try {
      const result = await window.electronAPI.embedKBEntries();
      if (isError(result)) {
        console.error('Failed to embed KB entries:', result.error);
        return null;
      }
      await get().loadKBEntries();
      return result;
    } catch (err) {
      console.error('Failed to embed KB entries:', err);
      return null;
    } finally {
      set({ isEmbedding: false });
    }
  },

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

  // Init
  loadInitialData: async () => {
    set({ isLoading: true });
    try {
      await Promise.all([
        get().loadMessages(),
        get().loadAccounts(),
        get().loadInboxStats(),
        get().loadSettings(),
        get().loadApiKeys(),
        get().loadModels(),
        get().loadSpcMetrics(),
        get().loadAutomationTiers(),
        get().loadRedlineTopics(),
        get().loadKBEntries(),
        get().loadOrchestrations(),
      ]);
    } catch (err) {
      console.error('Failed to load initial data:', err);
    } finally {
      set({ isLoading: false });
    }
  },
}));
