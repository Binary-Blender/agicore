# SCREAMO DEVELOPMENT PLAN - PHASE 3
## Frontend Development

**Version:** 1.0
**Last Updated:** 2025-11-23
**Duration:** 3-4 weeks
**Dependencies:** Phase 2 complete

---

## TABLE OF CONTENTS

1. [Phase 3 Overview](#phase-3-overview)
2. [Sprint 3.1: Core UI Components](#sprint-31-core-ui-components)
3. [Sprint 3.2: Dashboard & Inbox](#sprint-32-dashboard--inbox)
4. [Sprint 3.3: Message Detail & Draft View](#sprint-33-message-detail--draft-view)
5. [Sprint 3.4: Feed Scanner UI](#sprint-34-feed-scanner-ui)
6. [Phase 3 Testing & Validation](#phase-3-testing--validation)

---

## PHASE 3 OVERVIEW

### Objectives

Phase 3 builds the complete user interface:

- Dashboard with metrics overview
- Unified inbox with prioritization
- Message detail view with thread context
- Draft generation and editing interface
- Feed scanner for proactive engagement
- Responsive design for desktop and tablet

### Success Criteria

- [ ] All UI components functional
- [ ] API integration complete
- [ ] Responsive design working
- [ ] User flows smooth and intuitive
- [ ] Loading states and error handling
- [ ] Accessibility standards met

---

## SPRINT 3.1: CORE UI COMPONENTS

**Duration:** 4-5 days

---

### STEP 3.1.1: Set Up React Query

**File: `frontend/src/App.tsx`**
```typescript
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Dashboard } from './pages/Dashboard';
import { Inbox } from './pages/Inbox';
import { MessageDetail } from './pages/MessageDetail';
import './App.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <div className="min-h-screen bg-gray-50">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/inbox" element={<Inbox />} />
            <Route path="/message/:messageId" element={<MessageDetail />} />
          </Routes>
        </div>
      </Router>
    </QueryClientProvider>
  );
}

export default App;
```

**Acceptance Criteria:**
- [ ] React Query configured
- [ ] React Router set up
- [ ] Basic routes defined

---

### STEP 3.1.2: Create API Service Layer

**File: `frontend/src/services/api.ts`**
```typescript
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// API Methods
export const api = {
  // Messages
  getInbox: async (params?: { limit?: number; channel_type?: string }) => {
    const response = await apiClient.get('/api/ui/inbox', { params });
    return response.data;
  },

  getMessage: async (messageId: string) => {
    const response = await apiClient.get(`/api/ui/message/${messageId}/detail`);
    return response.data;
  },

  // Classification
  classifyMessage: async (messageId: string) => {
    const response = await apiClient.post(`/api/classification/classify/${messageId}`);
    return response.data;
  },

  // Drafts
  generateDraft: async (messageId: string, mode: string) => {
    const response = await apiClient.post(`/api/drafts/generate/${messageId}`, {
      response_mode: mode,
    });
    return response.data;
  },

  getDraft: async (draftId: string) => {
    const response = await apiClient.get(`/api/drafts/${draftId}`);
    return response.data;
  },

  regenerateDraft: async (draftId: string, mode: string) => {
    const response = await apiClient.post(`/api/drafts/regenerate/${draftId}`, {
      response_mode: mode,
    });
    return response.data;
  },

  // Feedback
  submitFeedback: async (data: {
    draft_id: string;
    final_text?: string;
    user_rating?: number;
    was_sent: boolean;
  }) => {
    const response = await apiClient.post('/api/feedback/submit', data);
    return response.data;
  },

  acceptDraft: async (draftId: string) => {
    const response = await apiClient.post(`/api/feedback/accept/${draftId}`);
    return response.data;
  },

  rejectDraft: async (draftId: string, reason?: string) => {
    const response = await apiClient.post(`/api/feedback/reject/${draftId}`, {
      rejection_reason: reason,
    });
    return response.data;
  },

  // Dashboard
  getDashboard: async () => {
    const response = await apiClient.get('/api/ui/dashboard');
    return response.data;
  },

  // Ingestion
  getIngestionStatus: async () => {
    const response = await apiClient.get('/api/ingestion/status');
    return response.data;
  },
};
```

**File: `frontend/src/types/index.ts`**
```typescript
export interface Message {
  message_id: string;
  external_id: string;
  channel_type: 'EMAIL' | 'LINKEDIN_DM' | 'LINKEDIN_COMMENT' | 'YOUTUBE_COMMENT';
  sender_name: string;
  sender_handle: string;
  timestamp_received: string;
  message_body: string;
  priority_score: number;
  classification?: Classification;
  has_draft: boolean;
  thread_message_count: number;
}

export interface Classification {
  classification_id: string;
  opportunity_type: string;
  sentiment: string;
  intent: string;
  confidence: number;
  explanation: string;
}

export interface Draft {
  draft_id: string;
  message_id: string;
  response_mode: 'STANDARD' | 'AGREE_AMPLIFY' | 'EDUCATE' | 'BATTLE';
  draft_text: string;
  style_pass_applied: boolean;
  confidence: number;
}

export interface MessageDetail {
  message: Message;
  classification: Classification;
  thread_context: Message[];
  available_drafts: Draft[];
}
```

**Acceptance Criteria:**
- [ ] API client configured
- [ ] All API methods defined
- [ ] TypeScript types created
- [ ] Error handling with interceptors

---

### STEP 3.1.3: Create Reusable UI Components

**File: `frontend/src/components/Card.tsx`**
```typescript
import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({ children, className = '', onClick }) => {
  return (
    <div
      className={`bg-white rounded-lg shadow-sm border border-gray-200 p-4 ${className} ${
        onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''
      }`}
      onClick={onClick}
    >
      {children}
    </div>
  );
};
```

**File: `frontend/src/components/Button.tsx`**
```typescript
import React from 'react';

interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  loading?: boolean;
  className?: string;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  onClick,
  variant = 'primary',
  disabled = false,
  loading = false,
  className = '',
}) => {
  const baseStyles = 'px-4 py-2 rounded-md font-medium transition-colors focus:outline-none focus:ring-2';

  const variantStyles = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
    secondary: 'bg-gray-200 text-gray-800 hover:bg-gray-300 focus:ring-gray-400',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
  };

  const disabledStyles = 'opacity-50 cursor-not-allowed';

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`${baseStyles} ${variantStyles[variant]} ${
        disabled || loading ? disabledStyles : ''
      } ${className}`}
    >
      {loading ? 'Loading...' : children}
    </button>
  );
};
```

**File: `frontend/src/components/Badge.tsx`**
```typescript
import React from 'react';

interface BadgeProps {
  text: string;
  variant?: 'success' | 'warning' | 'error' | 'info';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ text, variant = 'info', className = '' }) => {
  const variantStyles = {
    success: 'bg-green-100 text-green-800',
    warning: 'bg-yellow-100 text-yellow-800',
    error: 'bg-red-100 text-red-800',
    info: 'bg-blue-100 text-blue-800',
  };

  return (
    <span className={`px-2 py-1 text-xs font-medium rounded ${variantStyles[variant]} ${className}`}>
      {text}
    </span>
  );
};
```

**File: `frontend/src/components/Spinner.tsx`**
```typescript
import React from 'react';

export const Spinner: React.FC<{ size?: 'sm' | 'md' | 'lg' }> = ({ size = 'md' }) => {
  const sizeStyles = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  return (
    <div className="flex justify-center items-center">
      <div
        className={`${sizeStyles[size]} border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin`}
      />
    </div>
  );
};
```

**Acceptance Criteria:**
- [ ] Card component created
- [ ] Button component with variants
- [ ] Badge component for labels
- [ ] Spinner for loading states
- [ ] All components styled with Tailwind

---

### STEP 3.1.4: Create Layout Components

**File: `frontend/src/components/Layout.tsx`**
```typescript
import React from 'react';
import { Link, useLocation } from 'react-router-dom';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-8">
              <h1 className="text-2xl font-bold text-gray-900">SCREAMO</h1>
              <nav className="flex space-x-4">
                <Link
                  to="/"
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    isActive('/')
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  Dashboard
                </Link>
                <Link
                  to="/inbox"
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    isActive('/inbox')
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  Inbox
                </Link>
              </nav>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">Settings</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">{children}</main>
    </div>
  );
};
```

**Acceptance Criteria:**
- [ ] Layout component created
- [ ] Navigation working
- [ ] Active route highlighting
- [ ] Responsive design

---

## SPRINT 3.2: DASHBOARD & INBOX

**Duration:** 5-7 days

---

### STEP 3.2.1: Create Dashboard Page

**File: `frontend/src/pages/Dashboard.tsx`**
```typescript
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Layout } from '../components/Layout';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { Spinner } from '../components/Spinner';
import { api } from '../services/api';

export const Dashboard: React.FC = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard'],
    queryFn: api.getDashboard,
  });

  if (isLoading) {
    return (
      <Layout>
        <Spinner size="lg" />
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="text-red-600">Error loading dashboard</div>
      </Layout>
    );
  }

  const dashboardData = data?.data || {};

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Dashboard</h2>
          <p className="text-gray-600 mt-1">Overview of your communication workflow</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">New Messages</p>
                <p className="text-3xl font-bold text-gray-900">{dashboardData.new_messages_count || 0}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending Review</p>
                <p className="text-3xl font-bold text-gray-900">{dashboardData.pending_review_count || 0}</p>
              </div>
              <div className="p-3 bg-yellow-100 rounded-full">
                <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">High Priority</p>
                <p className="text-3xl font-bold text-gray-900">
                  {dashboardData.high_priority_messages?.length || 0}
                </p>
              </div>
              <div className="p-3 bg-red-100 rounded-full">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
            </div>
          </Card>
        </div>

        {/* SPC Status */}
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Automation Status (SPC)</h3>
          <div className="space-y-2">
            {Object.entries(dashboardData.spc_status || {}).map(([key, status]) => (
              <div key={key} className="flex items-center justify-between">
                <span className="text-sm text-gray-700">{key.replace(/_/g, ' ')}</span>
                <Badge
                  text={status as string}
                  variant={status === 'IN_CONTROL' ? 'success' : status === 'WARNING' ? 'warning' : 'error'}
                />
              </div>
            ))}
          </div>
        </Card>

        {/* Recent High Priority Messages */}
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">High Priority Messages</h3>
          <div className="space-y-3">
            {(dashboardData.high_priority_messages || []).slice(0, 5).map((message: any) => (
              <div
                key={message.message_id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer"
                onClick={() => window.location.href = `/message/${message.message_id}`}
              >
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{message.sender_name}</p>
                  <p className="text-sm text-gray-600 truncate">{message.message_body.substring(0, 80)}...</p>
                </div>
                <div className="ml-4 flex items-center space-x-2">
                  <Badge text={message.channel_type} variant="info" />
                  <span className="text-sm font-medium text-gray-700">
                    Priority: {message.priority_score.toFixed(1)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </Layout>
  );
};
```

**Acceptance Criteria:**
- [ ] Dashboard page created
- [ ] Stats cards displaying data
- [ ] SPC status shown
- [ ] High priority messages listed
- [ ] Loading and error states

---

### STEP 3.2.2: Create Inbox Page

**File: `frontend/src/pages/Inbox.tsx`**
```typescript
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { Spinner } from '../components/Spinner';
import { api } from '../services/api';
import { Message } from '../types';

export const Inbox: React.FC = () => {
  const navigate = useNavigate();
  const [channelFilter, setChannelFilter] = useState<string | undefined>(undefined);

  const { data, isLoading, error } = useQuery({
    queryKey: ['inbox', channelFilter],
    queryFn: () => api.getInbox({ channel_type: channelFilter }),
  });

  if (isLoading) {
    return (
      <Layout>
        <Spinner size="lg" />
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="text-red-600">Error loading inbox</div>
      </Layout>
    );
  }

  const messages: Message[] = data?.data?.messages || [];

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Inbox</h2>
            <p className="text-gray-600 mt-1">{messages.length} messages</p>
          </div>

          {/* Channel Filter */}
          <select
            value={channelFilter || 'all'}
            onChange={(e) => setChannelFilter(e.target.value === 'all' ? undefined : e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Channels</option>
            <option value="EMAIL">Email</option>
            <option value="LINKEDIN_DM">LinkedIn DM</option>
            <option value="LINKEDIN_COMMENT">LinkedIn Comment</option>
            <option value="YOUTUBE_COMMENT">YouTube Comment</option>
          </select>
        </div>

        {/* Message List */}
        <div className="space-y-3">
          {messages.map((message) => (
            <Card
              key={message.message_id}
              onClick={() => navigate(`/message/${message.message_id}`)}
              className="hover:border-blue-400 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  {/* Header Row */}
                  <div className="flex items-center space-x-3 mb-2">
                    <span className="font-semibold text-gray-900">{message.sender_name}</span>
                    <Badge text={message.channel_type} variant="info" />
                    {message.classification && (
                      <Badge
                        text={message.classification.opportunity_type}
                        variant={
                          message.classification.opportunity_type === 'SPAM'
                            ? 'error'
                            : message.classification.opportunity_type === 'PARTNERSHIP'
                            ? 'success'
                            : 'info'
                        }
                      />
                    )}
                  </div>

                  {/* Message Preview */}
                  <p className="text-gray-700 line-clamp-2">{message.message_body}</p>

                  {/* Metadata Row */}
                  <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                    <span>{new Date(message.timestamp_received).toLocaleString()}</span>
                    {message.thread_message_count > 1 && (
                      <span>Thread ({message.thread_message_count} messages)</span>
                    )}
                    {message.has_draft && <span className="text-blue-600">✓ Draft available</span>}
                  </div>
                </div>

                {/* Priority Score */}
                <div className="ml-4 text-right">
                  <div className="text-2xl font-bold text-gray-900">{message.priority_score.toFixed(1)}</div>
                  <div className="text-xs text-gray-500">Priority</div>
                </div>
              </div>
            </Card>
          ))}

          {messages.length === 0 && (
            <Card className="text-center py-12">
              <p className="text-gray-500 text-lg">No messages in inbox</p>
            </Card>
          )}
        </div>
      </div>
    </Layout>
  );
};
```

**Acceptance Criteria:**
- [ ] Inbox page created
- [ ] Messages displayed sorted by priority
- [ ] Channel filtering working
- [ ] Message cards clickable
- [ ] Priority scores visible
- [ ] Classification badges shown

---

## SPRINT 3.3: MESSAGE DETAIL & DRAFT VIEW

**Duration:** 6-8 days

---

### STEP 3.3.1: Create Message Detail Page

**File: `frontend/src/pages/MessageDetail.tsx`**
```typescript
import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Layout } from '../components/Layout';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Badge } from '../components/Badge';
import { Spinner } from '../components/Spinner';
import { DraftEditor } from '../components/DraftEditor';
import { api } from '../services/api';

export const MessageDetail: React.FC = () => {
  const { messageId } = useParams<{ messageId: string }>();
  const queryClient = useQueryClient();
  const [selectedMode, setSelectedMode] = useState<string>('STANDARD');
  const [showDraftEditor, setShowDraftEditor] = useState(false);

  // Fetch message detail
  const { data, isLoading, error } = useQuery({
    queryKey: ['message-detail', messageId],
    queryFn: () => api.getMessage(messageId!),
    enabled: !!messageId,
  });

  // Generate draft mutation
  const generateDraftMutation = useMutation({
    mutationFn: ({ mode }: { mode: string }) => api.generateDraft(messageId!, mode),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['message-detail', messageId] });
      setShowDraftEditor(true);
    },
  });

  if (isLoading) {
    return (
      <Layout>
        <Spinner size="lg" />
      </Layout>
    );
  }

  if (error || !data) {
    return (
      <Layout>
        <div className="text-red-600">Error loading message</div>
      </Layout>
    );
  }

  const messageDetail = data.data;
  const { message, classification, thread_context, available_drafts } = messageDetail;

  return (
    <Layout>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Message */}
        <div className="lg:col-span-2 space-y-6">
          {/* Message Card */}
          <Card>
            <div className="space-y-4">
              {/* Header */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-2xl font-bold text-gray-900">{message.sender_name}</h2>
                  <Badge text={message.channel_type} variant="info" />
                </div>
                <p className="text-sm text-gray-600">{message.sender_handle}</p>
                <p className="text-sm text-gray-500">{new Date(message.timestamp_received).toLocaleString()}</p>
              </div>

              {/* Classification */}
              {classification && (
                <div className="flex flex-wrap gap-2">
                  <Badge text={classification.opportunity_type} variant="info" />
                  <Badge
                    text={classification.sentiment}
                    variant={
                      classification.sentiment === 'POSITIVE'
                        ? 'success'
                        : classification.sentiment === 'HOSTILE'
                        ? 'error'
                        : 'warning'
                    }
                  />
                  <Badge text={`${(classification.confidence * 100).toFixed(0)}% confident`} variant="info" />
                </div>
              )}

              {/* Message Body */}
              <div className="prose prose-sm max-w-none">
                <div className="whitespace-pre-wrap bg-gray-50 p-4 rounded-lg">{message.message_body}</div>
              </div>

              {/* Priority Score */}
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">Priority Score:</span>
                <span className="text-lg font-bold text-gray-900">{message.priority_score.toFixed(1)}</span>
              </div>
            </div>
          </Card>

          {/* Thread Context */}
          {thread_context && thread_context.length > 0 && (
            <Card>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Thread Context</h3>
              <div className="space-y-3">
                {thread_context.map((msg: any) => (
                  <div key={msg.message_id} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-gray-900">{msg.sender_name}</span>
                      <span className="text-xs text-gray-500">
                        {new Date(msg.timestamp_received).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700">{msg.message_body}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Draft Editor */}
          {showDraftEditor && available_drafts.length > 0 && (
            <DraftEditor
              draft={available_drafts[0]}
              onClose={() => setShowDraftEditor(false)}
              onSave={() => {
                queryClient.invalidateQueries({ queryKey: ['message-detail', messageId] });
                setShowDraftEditor(false);
              }}
            />
          )}
        </div>

        {/* Right Column - Actions */}
        <div className="space-y-6">
          {/* Generate Draft */}
          <Card>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Generate Response</h3>

            {/* Mode Selector */}
            <div className="space-y-2 mb-4">
              <label className="text-sm font-medium text-gray-700">Response Mode:</label>
              <select
                value={selectedMode}
                onChange={(e) => setSelectedMode(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="STANDARD">Standard Reply</option>
                <option value="AGREE_AMPLIFY">Agree & Amplify</option>
                <option value="EDUCATE">Educate</option>
                <option value="BATTLE">Battle Mode</option>
              </select>
            </div>

            <Button
              onClick={() => generateDraftMutation.mutate({ mode: selectedMode })}
              loading={generateDraftMutation.isPending}
              className="w-full"
            >
              Generate Draft
            </Button>
          </Card>

          {/* Available Drafts */}
          {available_drafts.length > 0 && (
            <Card>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Available Drafts</h3>
              <div className="space-y-2">
                {available_drafts.map((draft: any) => (
                  <div
                    key={draft.draft_id}
                    className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer"
                    onClick={() => setShowDraftEditor(true)}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-900">{draft.response_mode}</span>
                      <Badge
                        text={`${(draft.confidence * 100).toFixed(0)}%`}
                        variant="info"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Classification Explanation */}
          {classification?.explanation && (
            <Card>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Classification Notes</h3>
              <p className="text-sm text-gray-700">{classification.explanation}</p>
            </Card>
          )}
        </div>
      </div>
    </Layout>
  );
};
```

**Acceptance Criteria:**
- [ ] Message detail page created
- [ ] Message content displayed
- [ ] Classification shown
- [ ] Thread context displayed
- [ ] Draft generation working
- [ ] Mode selector functional

---

### STEP 3.3.2: Create Draft Editor Component

**File: `frontend/src/components/DraftEditor.tsx`**
```typescript
import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Card } from './Card';
import { Button } from './Button';
import { api } from '../services/api';
import { Draft } from '../types';

interface DraftEditorProps {
  draft: Draft;
  onClose: () => void;
  onSave: () => void;
}

export const DraftEditor: React.FC<DraftEditorProps> = ({ draft, onClose, onSave }) => {
  const [editedText, setEditedText] = useState(draft.draft_text);
  const [userRating, setUserRating] = useState<number>(0);

  const submitFeedbackMutation = useMutation({
    mutationFn: (data: { final_text?: string; user_rating?: number; was_sent: boolean }) =>
      api.submitFeedback({
        draft_id: draft.draft_id,
        ...data,
      }),
    onSuccess: () => {
      onSave();
    },
  });

  const acceptMutation = useMutation({
    mutationFn: () => api.acceptDraft(draft.draft_id),
    onSuccess: () => {
      onSave();
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (reason: string) => api.rejectDraft(draft.draft_id, reason),
    onSuccess: () => {
      onSave();
    },
  });

  const handleSend = () => {
    const hasEdits = editedText !== draft.draft_text;

    if (hasEdits) {
      submitFeedbackMutation.mutate({
        final_text: editedText,
        user_rating: userRating || undefined,
        was_sent: true,
      });
    } else {
      acceptMutation.mutate();
    }
  };

  return (
    <Card>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Draft Response - {draft.response_mode}</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Editor */}
        <textarea
          value={editedText}
          onChange={(e) => setEditedText(e.target.value)}
          className="w-full h-64 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
        />

        {/* Rating */}
        <div>
          <label className="text-sm font-medium text-gray-700 mb-2 block">Rate this draft (optional):</label>
          <div className="flex space-x-2">
            {[1, 2, 3, 4, 5].map((rating) => (
              <button
                key={rating}
                onClick={() => setUserRating(rating)}
                className={`p-2 rounded ${
                  userRating >= rating ? 'text-yellow-500' : 'text-gray-300'
                } hover:text-yellow-500 transition-colors`}
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-200">
          <Button
            onClick={() => rejectMutation.mutate('User rejected draft')}
            variant="danger"
            loading={rejectMutation.isPending}
          >
            Reject
          </Button>

          <div className="flex space-x-3">
            <Button
              onClick={onClose}
              variant="secondary"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSend}
              loading={submitFeedbackMutation.isPending || acceptMutation.isPending}
            >
              {editedText !== draft.draft_text ? 'Save & Send' : 'Accept & Send'}
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
};
```

**Acceptance Criteria:**
- [ ] Draft editor component created
- [ ] Text editable
- [ ] Rating system working
- [ ] Accept/reject/save actions functional
- [ ] Feedback submitted to API

---

## SPRINT 3.4: FEED SCANNER UI

**Duration:** 3-4 days

---

### STEP 3.4.1: Create Feed Scanner Page (Stub for Future)

**File: `frontend/src/pages/FeedScanner.tsx`**
```typescript
import React from 'react';
import { Layout } from '../components/Layout';
import { Card } from '../components/Card';

export const FeedScanner: React.FC = () => {
  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Feed Scanner</h2>
          <p className="text-gray-600 mt-1">Proactive engagement opportunities (Coming Soon)</p>
        </div>

        <Card className="text-center py-12">
          <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <p className="text-gray-500 text-lg">Feed scanner coming in Phase 4</p>
          <p className="text-gray-400 text-sm mt-2">
            This feature will scan LinkedIn feeds for engagement opportunities
          </p>
        </Card>
      </div>
    </Layout>
  );
};
```

**Acceptance Criteria:**
- [ ] Placeholder page created
- [ ] Coming soon message displayed

---

## PHASE 3 TESTING & VALIDATION

---

### STEP 3.5.1: Component Testing

**File: `frontend/src/components/__tests__/Button.test.tsx`**
```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '../Button';

describe('Button', () => {
  it('renders button with text', () => {
    render(<Button>Click Me</Button>);
    expect(screen.getByText('Click Me')).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click Me</Button>);
    fireEvent.click(screen.getByText('Click Me'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('shows loading state', () => {
    render(<Button loading>Click Me</Button>);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('disables button when disabled prop is true', () => {
    render(<Button disabled>Click Me</Button>);
    expect(screen.getByText('Click Me')).toBeDisabled();
  });
});
```

**Run Tests:**
```bash
cd frontend
npm test
```

**Acceptance Criteria:**
- [ ] All component tests passing
- [ ] Coverage > 70%

---

### STEP 3.5.2: End-to-End Testing with Playwright

**File: `frontend/e2e/inbox.spec.ts`**
```typescript
import { test, expect } from '@playwright/test';

test.describe('Inbox', () => {
  test('displays messages in inbox', async ({ page }) => {
    await page.goto('http://localhost:3000/inbox');

    // Wait for messages to load
    await page.waitForSelector('[data-testid="message-card"]');

    // Check that messages are displayed
    const messages = await page.$$('[data-testid="message-card"]');
    expect(messages.length).toBeGreaterThan(0);
  });

  test('filters by channel type', async ({ page }) => {
    await page.goto('http://localhost:3000/inbox');

    // Select EMAIL filter
    await page.selectOption('select', 'EMAIL');

    // Wait for filtered results
    await page.waitForTimeout(1000);

    // All visible messages should be EMAIL
    const badges = await page.$$('text=EMAIL');
    expect(badges.length).toBeGreaterThan(0);
  });

  test('navigates to message detail', async ({ page }) => {
    await page.goto('http://localhost:3000/inbox');

    // Click first message
    await page.click('[data-testid="message-card"]:first-child');

    // Should navigate to detail page
    await expect(page).toHaveURL(/\/message\/.+/);
  });
});
```

**Run E2E Tests:**
```bash
npx playwright test
```

**Acceptance Criteria:**
- [ ] E2E tests written
- [ ] All user flows tested
- [ ] Tests passing

---

### STEP 3.5.3: Accessibility Testing

**Checklist:**
- [ ] All interactive elements keyboard accessible
- [ ] Proper ARIA labels on components
- [ ] Color contrast ratios meet WCAG AA
- [ ] Form inputs have labels
- [ ] Error messages announced to screen readers

**Test with:**
```bash
npm run build
npx lighthouse http://localhost:3000 --view
```

**Acceptance Criteria:**
- [ ] Lighthouse accessibility score > 90
- [ ] Keyboard navigation working
- [ ] Screen reader compatible

---

## PHASE 3 COMPLETION CHECKLIST

- [ ] All pages created (Dashboard, Inbox, Message Detail)
- [ ] All components functional
- [ ] API integration complete
- [ ] Loading states implemented
- [ ] Error handling in place
- [ ] Responsive design working
- [ ] Component tests passing
- [ ] E2E tests passing
- [ ] Accessibility standards met
- [ ] Code reviewed and merged

---

**PROCEED TO PHASE 4: SPC Module & Automation**

See DEVELOPMENT_PLAN_PHASE_4.md for next steps.
