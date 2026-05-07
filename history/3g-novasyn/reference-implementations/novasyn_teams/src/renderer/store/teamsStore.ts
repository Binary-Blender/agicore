import { create } from 'zustand';
import type { Team, Channel, Member, Message, Call } from '../../shared/types';

interface TeamsState {
  // Data
  teams: Team[];
  currentTeamId: string | null;
  channels: Channel[];
  currentChannelId: string | null;
  members: Member[];
  messages: Message[];
  threadMessages: Message[];
  activeThreadParentId: string | null;
  calls: Call[];
  isLoading: boolean;
  displayName: string;
  avatarColor: string;
  apiKeys: Record<string, string>;

  // UI state
  showThreadPanel: boolean;
  showMemberList: boolean;
  showVaultBrowser: boolean;
  showOrchestrationBuilder: boolean;
  showOrchestrationRunner: boolean;
  showSettings: boolean;
  activeRunId: string | null;
  activeOrchName: string;

  // Actions — Teams
  loadInitialData: () => Promise<void>;
  createTeam: (name: string, description?: string) => Promise<Team | null>;
  updateTeam: (id: string, updates: Partial<Team>) => Promise<void>;

  // Actions — Channels
  loadChannels: (teamId: string) => Promise<void>;
  setCurrentChannel: (channelId: string) => Promise<void>;
  createChannel: (name: string, description?: string, isDirect?: boolean) => Promise<Channel | null>;
  updateChannel: (id: string, updates: Partial<Channel>) => Promise<void>;
  deleteChannel: (id: string) => Promise<void>;

  // Actions — Members
  loadMembers: (teamId: string) => Promise<void>;
  updateMember: (id: string, updates: Partial<Member>) => Promise<void>;

  // Actions — Messages
  loadMessages: (channelId: string) => Promise<void>;
  sendMessage: (content: string, messageType?: string, vaultItemId?: string, replyTo?: string) => Promise<void>;
  editMessage: (id: string, content: string) => Promise<void>;
  deleteMessage: (id: string) => Promise<void>;
  pinMessage: (id: string, isPinned: boolean) => Promise<void>;
  reactToMessage: (id: string, emoji: string) => Promise<void>;

  // Actions — Threads
  loadThread: (parentId: string) => Promise<void>;
  closeThread: () => void;

  // Actions — Calls
  loadCallHistory: (channelId: string) => Promise<void>;

  // Actions — UI toggles
  setShowThreadPanel: (show: boolean) => void;
  setShowMemberList: (show: boolean) => void;
  setShowVaultBrowser: (show: boolean) => void;
  setShowOrchestrationBuilder: (show: boolean) => void;
  setShowOrchestrationRunner: (show: boolean, runId?: string, orchName?: string) => void;
  setShowSettings: (show: boolean) => void;
  setDisplayName: (name: string) => void;
  setAvatarColor: (color: string) => void;
}

export const useTeamsStore = create<TeamsState>((set, get) => ({
  // Initial state
  teams: [],
  currentTeamId: null,
  channels: [],
  currentChannelId: null,
  members: [],
  messages: [],
  threadMessages: [],
  activeThreadParentId: null,
  calls: [],
  isLoading: false,
  displayName: '',
  avatarColor: '#14b8a6',
  apiKeys: {},
  showThreadPanel: false,
  showMemberList: false,
  showVaultBrowser: false,
  showOrchestrationBuilder: false,
  showOrchestrationRunner: false,
  showSettings: false,
  activeRunId: null,
  activeOrchName: '',

  // --- Load initial data ---
  loadInitialData: async () => {
    set({ isLoading: true });
    try {
      const teams = await window.electronAPI.teamGet();
      const apiKeys = await window.electronAPI.getApiKeys();
      const settings = await window.electronAPI.getSettings();
      set({
        teams: teams ? [teams] : [],
        currentTeamId: teams?.id || null,
        displayName: settings?.displayName || '',
        avatarColor: settings?.avatarColor || '#14b8a6',
        apiKeys: apiKeys || {},
      });
      if (teams?.id) {
        await get().loadChannels(teams.id);
        await get().loadMembers(teams.id);
        // Auto-select first channel
        const { channels } = get();
        if (channels.length > 0) {
          await get().setCurrentChannel(channels[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load initial data:', err);
    }
    set({ isLoading: false });
  },

  // --- Teams ---
  createTeam: async (name, description = '') => {
    try {
      const team = await window.electronAPI.teamCreate({ name, description });
      set((s) => ({ teams: [...s.teams, team], currentTeamId: team.id }));
      await get().loadChannels(team.id);
      await get().loadMembers(team.id);
      const { channels } = get();
      if (channels.length > 0) {
        await get().setCurrentChannel(channels[0].id);
      }
      return team;
    } catch (err) {
      console.error('Failed to create team:', err);
      return null;
    }
  },

  updateTeam: async (id, updates) => {
    try {
      const updated = await window.electronAPI.teamUpdate(id, updates);
      set((s) => ({ teams: s.teams.map((t) => (t.id === id ? updated : t)) }));
    } catch (err) {
      console.error('Failed to update team:', err);
    }
  },

  // --- Channels ---
  loadChannels: async (teamId) => {
    try {
      const channels = await window.electronAPI.channelList(teamId);
      set({ channels });
    } catch (err) {
      console.error('Failed to load channels:', err);
    }
  },

  setCurrentChannel: async (channelId) => {
    set({ currentChannelId: channelId, messages: [], isLoading: true });
    await get().loadMessages(channelId);
    set({ isLoading: false });
  },

  createChannel: async (name, description = '', isDirect = false) => {
    const { currentTeamId } = get();
    if (!currentTeamId) return null;
    try {
      const channel = await window.electronAPI.channelCreate({
        teamId: currentTeamId,
        name,
        description,
        isDirect,
      });
      set((s) => ({ channels: [...s.channels, channel] }));
      return channel;
    } catch (err) {
      console.error('Failed to create channel:', err);
      return null;
    }
  },

  updateChannel: async (id, updates) => {
    try {
      const updated = await window.electronAPI.channelUpdate(id, updates);
      set((s) => ({ channels: s.channels.map((c) => (c.id === id ? updated : c)) }));
    } catch (err) {
      console.error('Failed to update channel:', err);
    }
  },

  deleteChannel: async (id) => {
    try {
      await window.electronAPI.channelDelete(id);
      set((s) => ({
        channels: s.channels.filter((c) => c.id !== id),
        currentChannelId: s.currentChannelId === id ? null : s.currentChannelId,
      }));
    } catch (err) {
      console.error('Failed to delete channel:', err);
    }
  },

  // --- Members ---
  loadMembers: async (teamId) => {
    try {
      const members = await window.electronAPI.memberList(teamId);
      set({ members });
    } catch (err) {
      console.error('Failed to load members:', err);
    }
  },

  updateMember: async (id, updates) => {
    try {
      const updated = await window.electronAPI.memberUpdate(id, updates);
      set((s) => ({ members: s.members.map((m) => (m.id === id ? updated : m)) }));
    } catch (err) {
      console.error('Failed to update member:', err);
    }
  },

  // --- Messages ---
  loadMessages: async (channelId) => {
    try {
      const messages = await window.electronAPI.messageList(channelId);
      set({ messages });
    } catch (err) {
      console.error('Failed to load messages:', err);
    }
  },

  sendMessage: async (content, messageType = 'text', vaultItemId, replyTo) => {
    const { currentChannelId } = get();
    if (!currentChannelId) return;
    try {
      const message = await window.electronAPI.messageSend({
        channelId: currentChannelId,
        content,
        messageType,
        vaultItemId,
        replyTo,
      });
      if (replyTo && get().activeThreadParentId === replyTo) {
        set((s) => ({ threadMessages: [...s.threadMessages, message] }));
      }
      set((s) => ({ messages: [...s.messages, message] }));
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  },

  editMessage: async (id, content) => {
    try {
      const updated = await window.electronAPI.messageEdit(id, content);
      set((s) => ({
        messages: s.messages.map((m) => (m.id === id ? updated : m)),
        threadMessages: s.threadMessages.map((m) => (m.id === id ? updated : m)),
      }));
    } catch (err) {
      console.error('Failed to edit message:', err);
    }
  },

  deleteMessage: async (id) => {
    try {
      await window.electronAPI.messageDelete(id);
      set((s) => ({
        messages: s.messages.filter((m) => m.id !== id),
        threadMessages: s.threadMessages.filter((m) => m.id !== id),
      }));
    } catch (err) {
      console.error('Failed to delete message:', err);
    }
  },

  pinMessage: async (id, isPinned) => {
    try {
      const updated = await window.electronAPI.messagePin(id, isPinned);
      set((s) => ({
        messages: s.messages.map((m) => (m.id === id ? updated : m)),
      }));
    } catch (err) {
      console.error('Failed to pin message:', err);
    }
  },

  reactToMessage: async (id, emoji) => {
    try {
      const updated = await window.electronAPI.messageReact(id, emoji);
      set((s) => ({
        messages: s.messages.map((m) => (m.id === id ? updated : m)),
        threadMessages: s.threadMessages.map((m) => (m.id === id ? updated : m)),
      }));
    } catch (err) {
      console.error('Failed to react to message:', err);
    }
  },

  // --- Threads ---
  loadThread: async (parentId) => {
    try {
      const threadMessages = await window.electronAPI.threadList(parentId);
      set({ threadMessages, activeThreadParentId: parentId, showThreadPanel: true });
    } catch (err) {
      console.error('Failed to load thread:', err);
    }
  },

  closeThread: () => {
    set({ showThreadPanel: false, activeThreadParentId: null, threadMessages: [] });
  },

  // --- Calls ---
  loadCallHistory: async (channelId) => {
    try {
      const calls = await window.electronAPI.callGetHistory(channelId);
      set({ calls });
    } catch (err) {
      console.error('Failed to load call history:', err);
    }
  },

  // --- UI ---
  setShowThreadPanel: (show) => set({ showThreadPanel: show }),
  setShowMemberList: (show) => set({ showMemberList: show }),
  setShowVaultBrowser: (show) => set({ showVaultBrowser: show }),
  setShowOrchestrationBuilder: (show) => set({ showOrchestrationBuilder: show }),
  setShowOrchestrationRunner: (show, runId, orchName) =>
    set({ showOrchestrationRunner: show, activeRunId: runId || null, activeOrchName: orchName || '' }),
  setShowSettings: (show) => set({ showSettings: show }),
  setDisplayName: (name) => set({ displayName: name }),
  setAvatarColor: (color) => set({ avatarColor: color }),
}));
