import { create } from 'zustand';
import type { ForgeProject, AIModel, ForgeSettings, Conversation, Decision, AiRole, CreateDecisionInput, Feature, FeatureStep, CreateFeatureInput } from '../../shared/types';

export type ForgeView = 'dashboard' | 'new-project' | 'settings' | 'project-detail';

interface ForgeState {
  // Data
  projects: ForgeProject[];
  models: AIModel[];
  apiKeys: Record<string, string>;
  settings: ForgeSettings | null;

  // Sprint 2: Conversations & Chat
  conversations: Conversation[];
  currentConversationId: string | null;
  decisions: Decision[];
  streamingText: string;
  isStreaming: boolean;

  // Sprint 4: Features & Pipeline
  features: Feature[];
  currentFeatureId: string | null;
  featureSteps: FeatureStep[];
  isGenerating: boolean;

  // UI
  currentView: ForgeView;
  currentProjectId: string | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  setProjects: (projects: ForgeProject[]) => void;
  addProject: (project: ForgeProject) => void;
  updateProject: (id: string, updates: Partial<ForgeProject>) => void;
  removeProject: (id: string) => void;
  setModels: (models: AIModel[]) => void;
  setApiKeys: (keys: Record<string, string>) => void;
  setSettings: (settings: ForgeSettings) => void;
  setCurrentView: (view: ForgeView) => void;
  setCurrentProjectId: (id: string | null) => void;
  setIsLoading: (v: boolean) => void;
  setError: (e: string | null) => void;

  // Sprint 2 actions
  setConversations: (conversations: Conversation[]) => void;
  addConversation: (conversation: Conversation) => void;
  updateConversation: (id: string, updates: Partial<Conversation>) => void;
  removeConversation: (id: string) => void;
  setCurrentConversationId: (id: string | null) => void;
  setDecisions: (decisions: Decision[]) => void;
  addDecision: (decision: Decision) => void;
  removeDecision: (id: string) => void;
  setStreamingText: (text: string) => void;
  appendStreamingText: (text: string) => void;
  setIsStreaming: (v: boolean) => void;

  // Sprint 4 actions
  setFeatures: (features: Feature[]) => void;
  addFeature: (feature: Feature) => void;
  updateFeature: (id: string, updates: Partial<Feature>) => void;
  removeFeature: (id: string) => void;
  setCurrentFeatureId: (id: string | null) => void;
  setFeatureSteps: (steps: FeatureStep[]) => void;
  addOrUpdateFeatureStep: (step: FeatureStep) => void;
  setIsGenerating: (v: boolean) => void;
}

export const useForgeStore = create<ForgeState>((set) => ({
  projects: [],
  models: [],
  apiKeys: {},
  settings: null,
  conversations: [],
  currentConversationId: null,
  decisions: [],
  streamingText: '',
  isStreaming: false,
  features: [],
  currentFeatureId: null,
  featureSteps: [],
  isGenerating: false,
  currentView: 'dashboard',
  currentProjectId: null,
  isLoading: true,
  error: null,

  setProjects: (projects) => set({ projects }),
  addProject: (project) => set((s) => ({ projects: [project, ...s.projects] })),
  updateProject: (id, updates) => set((s) => ({
    projects: s.projects.map((p) => p.id === id ? { ...p, ...updates } : p),
  })),
  removeProject: (id) => set((s) => ({
    projects: s.projects.filter((p) => p.id !== id),
    currentProjectId: s.currentProjectId === id ? null : s.currentProjectId,
  })),
  setModels: (models) => set({ models }),
  setApiKeys: (apiKeys) => set({ apiKeys }),
  setSettings: (settings) => set({ settings }),
  setCurrentView: (currentView) => set({ currentView }),
  setCurrentProjectId: (currentProjectId) => set({ currentProjectId }),
  setIsLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),

  // Sprint 2 actions
  setConversations: (conversations) => set({ conversations }),
  addConversation: (conversation) => set((s) => ({ conversations: [conversation, ...s.conversations] })),
  updateConversation: (id, updates) => set((s) => ({
    conversations: s.conversations.map((c) => c.id === id ? { ...c, ...updates } : c),
  })),
  removeConversation: (id) => set((s) => ({
    conversations: s.conversations.filter((c) => c.id !== id),
    currentConversationId: s.currentConversationId === id ? null : s.currentConversationId,
  })),
  setCurrentConversationId: (currentConversationId) => set({ currentConversationId }),
  setDecisions: (decisions) => set({ decisions }),
  addDecision: (decision) => set((s) => ({ decisions: [decision, ...s.decisions] })),
  removeDecision: (id) => set((s) => ({ decisions: s.decisions.filter((d) => d.id !== id) })),
  setStreamingText: (streamingText) => set({ streamingText }),
  appendStreamingText: (text) => set((s) => ({ streamingText: s.streamingText + text })),
  setIsStreaming: (isStreaming) => set({ isStreaming }),

  // Sprint 4 actions
  setFeatures: (features) => set({ features }),
  addFeature: (feature) => set((s) => ({ features: [feature, ...s.features] })),
  updateFeature: (id, updates) => set((s) => ({
    features: s.features.map((f) => f.id === id ? { ...f, ...updates } : f),
  })),
  removeFeature: (id) => set((s) => ({
    features: s.features.filter((f) => f.id !== id),
    currentFeatureId: s.currentFeatureId === id ? null : s.currentFeatureId,
  })),
  setCurrentFeatureId: (currentFeatureId) => set({ currentFeatureId }),
  setFeatureSteps: (featureSteps) => set({ featureSteps }),
  addOrUpdateFeatureStep: (step) => set((s) => {
    const exists = s.featureSteps.find((fs) => fs.id === step.id);
    return {
      featureSteps: exists
        ? s.featureSteps.map((fs) => fs.id === step.id ? step : fs)
        : [...s.featureSteps, step],
    };
  }),
  setIsGenerating: (isGenerating) => set({ isGenerating }),
}));
