// NovaSyn Social — Sync Service
// Background sync manager. Handles interval-based polling for all connected accounts,
// token refresh, and per-account sync status tracking.

import type Database from 'better-sqlite3';
import { refreshAccessToken } from './oauthService';
import { syncGmailAccount } from './gmailService';

// ============================================================================
// Types
// ============================================================================

export interface SyncStatus {
  accountId: string;
  platform: string;
  isSyncing: boolean;
  lastError: string | null;
  messagesSynced: number;
  lastSyncAt: string | null;
}

interface SyncContext {
  db: Database.Database;
  getSettings: () => Record<string, string>;
  onNewMessages?: (count: number, platform: string) => void;
}

// ============================================================================
// Sync Service (Singleton)
// ============================================================================

class SyncServiceImpl {
  private statuses: Map<string, SyncStatus> = new Map();
  private autoSyncTimer: ReturnType<typeof setInterval> | null = null;
  private context: SyncContext | null = null;

  /**
   * Initialize with database and settings access.
   * Call this once during app startup after initDatabase().
   */
  init(context: SyncContext): void {
    this.context = context;
    console.log('[Sync] Service initialized');
  }

  /**
   * Get sync statuses for all tracked accounts.
   */
  getStatuses(): SyncStatus[] {
    return Array.from(this.statuses.values());
  }

  /**
   * Get sync status for a specific account.
   */
  getStatus(accountId: string): SyncStatus | null {
    return this.statuses.get(accountId) ?? null;
  }

  /**
   * Sync a single account. Handles token refresh if expired.
   */
  async syncAccount(accountId: string): Promise<SyncStatus> {
    if (!this.context) throw new Error('SyncService not initialized');
    const { db, getSettings } = this.context;

    // Load account from DB
    const account = db
      .prepare('SELECT * FROM accounts WHERE id = ?')
      .get(accountId) as any;

    if (!account) throw new Error('Account not found');
    if (!account.access_token) throw new Error('Account not connected');
    if (!account.is_active) throw new Error('Account is inactive');

    // Initialize status
    const status: SyncStatus = {
      accountId,
      platform: account.platform,
      isSyncing: true,
      lastError: null,
      messagesSynced: 0,
      lastSyncAt: account.last_sync_at,
    };
    this.statuses.set(accountId, status);

    try {
      // Refresh token if expired
      let accessToken = account.access_token;
      if (
        account.token_expires_at &&
        new Date(account.token_expires_at) < new Date()
      ) {
        accessToken = await this.refreshAccountToken(
          db,
          account,
          getSettings()
        );
      }

      // Dispatch to platform-specific sync
      let synced = 0;

      switch (account.platform) {
        case 'gmail': {
          const result = await syncGmailAccount(
            db,
            accountId,
            accessToken,
            account.last_sync_at
          );
          synced = result.synced;
          if (result.errors > 0) {
            status.lastError = `${result.errors} message(s) failed`;
          }
          console.log(
            `[Sync] Gmail: ${result.synced} synced, ${result.skipped} skipped, ${result.errors} errors`
          );
          break;
        }
        case 'linkedin':
          console.log('[Sync] LinkedIn sync — not yet implemented');
          break;
        case 'youtube':
          console.log('[Sync] YouTube sync — not yet implemented');
          break;
        case 'twitter':
          console.log('[Sync] Twitter/X sync — not yet implemented');
          break;
        default:
          console.log(`[Sync] Unknown platform: ${account.platform}`);
      }

      status.messagesSynced = synced;
      status.isSyncing = false;
      status.lastSyncAt = new Date().toISOString();

      // Notify about new messages
      if (synced > 0 && this.context?.onNewMessages) {
        this.context.onNewMessages(synced, account.platform);
      }
    } catch (err: any) {
      console.error(`[Sync] Account ${accountId} sync failed:`, err);
      status.isSyncing = false;
      status.lastError = err.message;
    }

    this.statuses.set(accountId, { ...status });
    return status;
  }

  /**
   * Sync all active, connected accounts.
   */
  async syncAll(): Promise<SyncStatus[]> {
    if (!this.context) throw new Error('SyncService not initialized');
    const { db } = this.context;

    const accounts = db
      .prepare(
        'SELECT id FROM accounts WHERE is_active = 1 AND access_token IS NOT NULL'
      )
      .all() as any[];

    const results: SyncStatus[] = [];
    for (const account of accounts) {
      try {
        const status = await this.syncAccount(account.id);
        results.push(status);
      } catch (err: any) {
        console.error(`[Sync] Skipping account ${account.id}:`, err.message);
      }
    }
    return results;
  }

  /**
   * Start automatic background sync at the given interval.
   */
  startAutoSync(intervalMinutes: number): void {
    this.stopAutoSync();
    if (intervalMinutes <= 0) return;

    console.log(`[Sync] Auto-sync started (every ${intervalMinutes}m)`);

    this.autoSyncTimer = setInterval(
      () =>
        this.syncAll().catch((err) =>
          console.error('[Sync] Auto-sync error:', err)
        ),
      intervalMinutes * 60 * 1000
    );

    // Initial sync on start
    this.syncAll().catch((err) =>
      console.error('[Sync] Initial auto-sync error:', err)
    );
  }

  /**
   * Stop automatic background sync.
   */
  stopAutoSync(): void {
    if (this.autoSyncTimer) {
      clearInterval(this.autoSyncTimer);
      this.autoSyncTimer = null;
      console.log('[Sync] Auto-sync stopped');
    }
  }

  /**
   * Whether auto-sync is currently running.
   */
  isAutoSyncRunning(): boolean {
    return this.autoSyncTimer !== null;
  }

  // --------------------------------------------------------------------------
  // Internal helpers
  // --------------------------------------------------------------------------

  private async refreshAccountToken(
    db: Database.Database,
    account: any,
    settings: Record<string, string>
  ): Promise<string> {
    const clientId = settings[`${account.platform}_client_id`] || '';
    const clientSecret = settings[`${account.platform}_client_secret`] || '';

    if (!clientId || !clientSecret) {
      throw new Error(
        `No OAuth credentials configured for ${account.platform}. ` +
          `Set ${account.platform}_client_id and ${account.platform}_client_secret in Settings.`
      );
    }

    const refreshed = await refreshAccessToken(
      account.platform,
      account.refresh_token,
      clientId,
      clientSecret
    );

    // Update tokens in DB
    db.prepare(
      'UPDATE accounts SET access_token = ?, token_expires_at = ? WHERE id = ?'
    ).run(refreshed.accessToken, refreshed.expiresAt, account.id);

    console.log(`[Sync] Refreshed token for ${account.platform} account ${account.id}`);
    return refreshed.accessToken;
  }
}

export const syncService = new SyncServiceImpl();
