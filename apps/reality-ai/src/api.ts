// Thin invoke wrappers around the Tauri commands declared in src-tauri/src/commands.rs.
// Generated from reality_ai.agi ACTION declarations (manual for now;
// will be auto-generated once the Agicore ACTION emitter lands).

import { invoke } from '@tauri-apps/api/core';
import type {
  Conversation,
  Message,
  AppStats,
  SendMessageResult,
  GameStateInfo,
} from './types';

export const listConversations = () =>
  invoke<Conversation[]>('list_conversations');

export const createConversation = () =>
  invoke<Conversation>('create_conversation');

export const deleteConversation = (id: string) =>
  invoke<void>('delete_conversation', { id });

export const getMessages = (conversationId: string) =>
  invoke<Message[]>('get_messages', { conversationId });

export const sendMessage = (conversationId: string, content: string) =>
  invoke<SendMessageResult>('send_message', { conversationId, content });

export const resetConversation = (conversationId: string) =>
  invoke<GameStateInfo>('reset_conversation', { conversationId });

export const getStats = () => invoke<AppStats>('get_stats');
