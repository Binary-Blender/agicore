import { create } from 'zustand';
import * as api from '../api';
import type { Conversation, Message, AppStats } from '../types';

interface UiGameState {
  layer: number;
  turnCount: number;
  easterEggsFound: number;
  totalEasterEggs: number;
  isWon: boolean;
  winMethod: string | null;
  startTime: number | null;
}

interface AppState {
  conversations: Conversation[];
  currentConversationId: string | null;
  messages: Message[];
  stats: AppStats | null;
  isThinking: boolean;
  isStarting: boolean;
  currentView: 'chat' | 'stats';
  gameState: UiGameState | null;

  loadConversations: () => Promise<void>;
  createConversation: () => Promise<void>;
  deleteConversation: (id: string) => Promise<void>;
  selectConversation: (id: string) => Promise<void>;
  sendMessage: (content: string) => Promise<void>;
  loadStats: () => Promise<void>;
  setCurrentView: (view: 'chat' | 'stats') => void;
  completeStartup: () => void;
  playAgain: () => Promise<void>;
}

export const useAppStore = create<AppState>((set, get) => ({
  conversations: [],
  currentConversationId: null,
  messages: [],
  stats: null,
  isThinking: false,
  isStarting: true,
  currentView: 'chat',
  gameState: null,

  completeStartup: () => set({ isStarting: false }),

  loadConversations: async () => {
    const conversations = await api.listConversations();
    set({ conversations });
  },

  createConversation: async () => {
    const conversation = await api.createConversation();
    set((state) => ({
      conversations: [conversation, ...state.conversations],
      currentConversationId: conversation.id,
      messages: [],
      currentView: 'chat',
      gameState: null,
    }));
  },

  deleteConversation: async (id: string) => {
    await api.deleteConversation(id);
    const { currentConversationId, conversations } = get();
    const remaining = conversations.filter((c) => c.id !== id);
    if (currentConversationId === id) {
      const next = remaining[0] ?? null;
      set({
        conversations: remaining,
        currentConversationId: next?.id ?? null,
        messages: [],
        gameState: null,
      });
      if (next) {
        const messages = await api.getMessages(next.id);
        set({ messages });
      }
    } else {
      set({ conversations: remaining });
    }
  },

  selectConversation: async (id: string) => {
    set({ currentConversationId: id, currentView: 'chat' });
    const messages = await api.getMessages(id);
    set({ messages });
  },

  sendMessage: async (content: string) => {
    const { currentConversationId, gameState } = get();
    if (!currentConversationId) return;

    if (!gameState) {
      set({
        gameState: {
          layer: 1,
          turnCount: 0,
          easterEggsFound: 0,
          totalEasterEggs: 10,
          isWon: false,
          winMethod: null,
          startTime: Date.now(),
        },
      });
    }

    const tempUserMessage: Message = {
      id: `temp-${Date.now()}`,
      conversationId: currentConversationId,
      role: 'user',
      content,
      createdAt: new Date().toISOString(),
    };
    set((state) => ({
      messages: [...state.messages, tempUserMessage],
      isThinking: true,
    }));

    try {
      const result = await api.sendMessage(currentConversationId, content);
      await new Promise<void>((resolve) =>
        setTimeout(resolve, result.thinkingDelay),
      );
      set((state) => ({
        messages: [...state.messages, result.message],
        isThinking: false,
        gameState: state.gameState
          ? {
              ...state.gameState,
              layer: result.gameState.layer,
              turnCount: result.gameState.turnCount,
              easterEggsFound: result.gameState.easterEggsFound,
              totalEasterEggs: result.gameState.totalEasterEggs,
              isWon: result.gameState.isWin,
              winMethod: result.gameState.winMethod,
            }
          : state.gameState,
      }));
      const conversations = await api.listConversations();
      set({ conversations });
    } catch (error) {
      console.error('send_message failed:', error);
      set({ isThinking: false });
    }
  },

  loadStats: async () => {
    const stats = await api.getStats();
    set({ stats });
  },

  setCurrentView: (view) => {
    set({ currentView: view });
    if (view === 'stats') get().loadStats();
  },

  playAgain: async () => {
    set({ gameState: null });
    const conversation = await api.createConversation();
    set((state) => ({
      conversations: [conversation, ...state.conversations],
      currentConversationId: conversation.id,
      messages: [],
      currentView: 'chat',
    }));
  },
}));
