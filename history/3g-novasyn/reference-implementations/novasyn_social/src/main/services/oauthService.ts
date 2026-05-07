// NovaSyn Social — OAuth2 Service
// Generic OAuth2 flow for Electron desktop apps.
// Opens a BrowserWindow for user authorization, catches the redirect,
// exchanges the code for tokens, and handles token refresh.

import { BrowserWindow } from 'electron';

// ============================================================================
// Types
// ============================================================================

export interface OAuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: string; // ISO date string
}

interface PlatformOAuthConfig {
  authUrl: string;
  tokenUrl: string;
  scopes: string[];
}

// ============================================================================
// Platform Configs
// ============================================================================

const PLATFORM_CONFIGS: Record<string, PlatformOAuthConfig> = {
  gmail: {
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    scopes: [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/userinfo.email',
    ],
  },
  linkedin: {
    authUrl: 'https://www.linkedin.com/oauth/v2/authorization',
    tokenUrl: 'https://www.linkedin.com/oauth/v2/accessToken',
    scopes: ['openid', 'profile', 'email'],
  },
  youtube: {
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    scopes: [
      'https://www.googleapis.com/auth/youtube.readonly',
      'https://www.googleapis.com/auth/userinfo.email',
    ],
  },
  twitter: {
    authUrl: 'https://twitter.com/i/oauth2/authorize',
    tokenUrl: 'https://api.twitter.com/2/oauth2/token',
    scopes: ['tweet.read', 'users.read', 'dm.read', 'offline.access'],
  },
};

export function getSupportedPlatforms(): string[] {
  return Object.keys(PLATFORM_CONFIGS);
}

// ============================================================================
// OAuth2 Flow
// ============================================================================

const REDIRECT_URI = 'http://localhost';

/**
 * Start an OAuth2 authorization flow for a platform.
 * Opens a BrowserWindow, watches for the redirect, exchanges the code for tokens.
 */
export async function startOAuthFlow(
  platform: string,
  clientId: string,
  clientSecret: string
): Promise<OAuthTokens> {
  const config = PLATFORM_CONFIGS[platform];
  if (!config) throw new Error(`Unsupported platform: ${platform}`);

  // Build the authorization URL
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: config.scopes.join(' '),
    access_type: 'offline',
    prompt: 'consent',
  });

  const authUrl = `${config.authUrl}?${params.toString()}`;

  return new Promise<OAuthTokens>((resolve, reject) => {
    let settled = false;

    const authWindow = new BrowserWindow({
      width: 600,
      height: 700,
      show: true,
      title: `Connect ${platform}`,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
      },
    });

    const handleCode = async (code: string) => {
      if (settled) return;
      settled = true;
      try {
        const tokens = await exchangeCodeForTokens(
          config.tokenUrl,
          code,
          clientId,
          clientSecret
        );
        resolve(tokens);
      } catch (err) {
        reject(err);
      }
      authWindow.close();
    };

    const checkUrl = (url: string) => {
      try {
        const parsed = new URL(url);
        if (parsed.hostname === 'localhost' || parsed.origin === REDIRECT_URI) {
          const code = parsed.searchParams.get('code');
          const error = parsed.searchParams.get('error');

          if (error) {
            settled = true;
            reject(new Error(`OAuth error: ${error}`));
            authWindow.close();
            return;
          }

          if (code) {
            handleCode(code);
          }
        }
      } catch {
        // Not a valid URL — ignore
      }
    };

    // Watch for redirect via navigation events
    authWindow.webContents.on('will-redirect', (_event, url) => {
      checkUrl(url);
    });

    authWindow.webContents.on('will-navigate', (_event, url) => {
      checkUrl(url);
    });

    // Also check on page load (some providers don't fire will-redirect)
    authWindow.webContents.on('did-navigate', (_event, url) => {
      checkUrl(url);
    });

    authWindow.on('closed', () => {
      if (!settled) {
        settled = true;
        reject(new Error('OAuth window closed by user'));
      }
    });

    authWindow.loadURL(authUrl);
  });
}

// ============================================================================
// Token Exchange
// ============================================================================

async function exchangeCodeForTokens(
  tokenUrl: string,
  code: string,
  clientId: string,
  clientSecret: string
): Promise<OAuthTokens> {
  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: REDIRECT_URI,
      grant_type: 'authorization_code',
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Token exchange failed (${response.status}): ${errText}`);
  }

  const data = await response.json();
  const expiresAt = new Date(
    Date.now() + (data.expires_in ?? 3600) * 1000
  ).toISOString();

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? '',
    expiresAt,
  };
}

// ============================================================================
// Token Refresh
// ============================================================================

/**
 * Refresh an expired access token using the refresh token.
 */
export async function refreshAccessToken(
  platform: string,
  refreshToken: string,
  clientId: string,
  clientSecret: string
): Promise<{ accessToken: string; expiresAt: string }> {
  const config = PLATFORM_CONFIGS[platform];
  if (!config) throw new Error(`Unsupported platform: ${platform}`);

  const response = await fetch(config.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Token refresh failed (${response.status}): ${errText}`);
  }

  const data = await response.json();
  const expiresAt = new Date(
    Date.now() + (data.expires_in ?? 3600) * 1000
  ).toISOString();

  return {
    accessToken: data.access_token,
    expiresAt,
  };
}
