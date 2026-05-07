import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests if available
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Auth API
export const authAPI = {
  register: async (data: {
    email: string;
    password: string;
    organization_id: string;
    department?: string;
    role?: string;
  }) => {
    const response = await api.post('/api/auth/register', data);
    return response.data;
  },

  login: async (email: string, password: string) => {
    const response = await api.post('/api/auth/login', { email, password });
    return response.data;
  },

  getCurrentUser: async () => {
    const response = await api.get('/api/auth/me');
    return response.data;
  },
};

// Video API
export const videoAPI = {
  create: async (data: any) => {
    const response = await api.post('/api/videos', data);
    return response.data;
  },

  update: async (id: string, data: any) => {
    const response = await api.put(`/api/videos/${id}`, data);
    return response.data;
  },

  delete: async (id: string) => {
    const response = await api.delete(`/api/videos/${id}`);
    return response.data;
  },
};

// Quiz API
export const quizAPI = {
  getByVideoId: async (videoId: string) => {
    const response = await api.get(`/api/quizzes/video/${videoId}`);
    return response.data;
  },

  getByTrainingModuleId: async (trainingModuleId: string) => {
    const response = await api.get(`/api/quizzes/training-module/${trainingModuleId}`);
    return response.data;
  },

  create: async (data: any) => {
    const response = await api.post('/api/quizzes', data);
    return response.data;
  },

  update: async (id: string, data: any) => {
    const response = await api.put(`/api/quizzes/${id}`, data);
    return response.data;
  },

  submit: async (data: {
    video_id: string;
    quiz_id: string;
    answers: Record<string, any>;
    hints_used?: string[];
  }) => {
    const response = await api.post('/api/quizzes/submit', data);
    return response.data;
  },

  getAttempts: async (videoId: string) => {
    const response = await api.get(`/api/quizzes/attempts/${videoId}`);
    return response.data;
  },

  getLatestAttemptByTrainingModule: async (trainingModuleId: string) => {
    const response = await api.get(`/api/quizzes/latest/training-module/${trainingModuleId}`);
    return response.data;
  },
};

// Progress API
export const progressAPI = {
  recordWatch: async (data: {
    video_id: string;
    watch_percentage: number;
    device_type?: string;
  }) => {
    const response = await api.post('/api/progress/watch', data);
    return response.data;
  },

  getUserProgress: async () => {
    const response = await api.get('/api/progress/user');
    return response.data;
  },

  getVideoProgress: async (videoId: string) => {
    const response = await api.get(`/api/progress/video/${videoId}`);
    return response.data;
  },

  getStats: async () => {
    const response = await api.get('/api/progress/stats');
    return response.data;
  },
};

// Favorites API
export const favoritesAPI = {
  getAll: async () => {
    const response = await api.get('/api/favorites');
    return response.data;
  },

  add: async (videoId: string) => {
    const response = await api.post('/api/favorites', { video_id: videoId });
    return response.data;
  },

  remove: async (videoId: string) => {
    const response = await api.delete(`/api/favorites/${videoId}`);
    return response.data;
  },

  checkStatus: async (videoId: string) => {
    const response = await api.get(`/api/favorites/check/${videoId}`);
    return response.data;
  },
};

// Preferences API
export const preferencesAPI = {
  getGenre: async () => {
    const response = await api.get('/api/preferences/genre');
    return response.data;
  },

  setGenre: async (genre: string) => {
    const response = await api.put('/api/preferences/genre', { genre });
    return response.data;
  },

  clearGenre: async () => {
    const response = await api.delete('/api/preferences/genre');
    return response.data;
  },
};

// Training Modules API
export const trainingModulesAPI = {
  getAll: async () => {
    const response = await api.get('/api/training-modules');
    return response.data;
  },

  getById: async (id: string, preferred_genre?: string) => {
    const params = preferred_genre ? { preferred_genre } : {};
    const response = await api.get(`/api/training-modules/${id}`, { params });
    return response.data;
  },

  getAvailableGenres: async (id: string) => {
    const response = await api.get(`/api/training-modules/${id}/genres`);
    return response.data;
  },

  create: async (data: any) => {
    const response = await api.post('/api/training-modules', data);
    return response.data;
  },

  update: async (id: string, data: any) => {
    const response = await api.put(`/api/training-modules/${id}`, data);
    return response.data;
  },

  delete: async (id: string) => {
    const response = await api.delete(`/api/training-modules/${id}`);
    return response.data;
  },

  uploadPolicy: async (id: string, file: File) => {
    const formData = new FormData();
    formData.append('policy', file);
    const response = await api.post(`/api/training-modules/${id}/policy`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  downloadPolicy: async (id: string) => {
    return api.get(`/api/training-modules/${id}/policy/download`, {
      responseType: 'blob',
    });
  },

  clearPolicy: async (id: string) => {
    const response = await api.delete(`/api/training-modules/${id}/policy`);
    return response.data;
  },
};

export const aiAPI = {
  generateLyrics: async (formData: FormData) => {
    const response = await api.post('/api/ai/lyrics', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  generateOverlays: async (formData: FormData) => {
    const response = await api.post('/api/ai/overlays', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  generateQuizQuestions: async (formData: FormData) => {
    const response = await api.post('/api/ai/quiz', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  generateSong: async (data: {
    training_module_id: string;
    lyrics?: string;
    style_preset?: string;
    custom_style?: string;
    duration_ms?: number;
    emphasis_points?: string[];
  }) => {
    const response = await api.post('/api/ai/song', data);
    return response.data;
  },

  deleteSong: async (songId: string) => {
    const response = await api.delete(`/api/ai/song/${songId}`);
    return response.data;
  },
};

export const assetsAPI = {
  list: async () => {
    const response = await api.get('/api/assets');
    return response.data;
  },
  listPending: async () => {
    const response = await api.get('/api/assets/pending');
    return response.data;
  },
  approve: async (assetId: string) => {
    const response = await api.post(`/api/assets/${assetId}/approve`);
    return response.data;
  },
  reject: async (assetId: string) => {
    const response = await api.post(`/api/assets/${assetId}/reject`);
    return response.data;
  },
  upload: async (formData: FormData) => {
    const response = await api.post('/api/assets/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },
  update: async (assetId: string, data: any) => {
    const response = await api.put(`/api/assets/${assetId}`, data);
    return response.data;
  },
  remove: async (assetId: string) => {
    const response = await api.delete(`/api/assets/${assetId}`);
    return response.data;
  },
};

// Visual Assets API (Images & Videos)
export const visualAssetsAPI = {
  // Generate contextual prompt for reminder phrase
  generatePrompt: async (data: {
    training_module_id?: string;
    reminder_phrase: string;
    policy_override?: string;
    lyrics_override?: string;
  }) => {
    const response = await api.post('/api/ai/visual/prompt', data);
    return response.data;
  },

  // List visual assets with filtering
  list: async (params?: {
    training_module_id?: string;
    asset_type?: string;
    status?: string;
  }) => {
    const response = await api.get('/api/visual-assets', { params });
    return response.data;
  },

  // List pending QC assets
  listPending: async () => {
    const response = await api.get('/api/visual-assets/pending');
    return response.data;
  },

  // Generate image from prompt
  generateImage: async (data: {
    training_module_id?: string;
    reminder_phrase: string;
    prompt?: string;
    negative_prompt?: string;
    size?: string;
    quality?: string;
    style?: string;
  }) => {
    const response = await api.post('/api/visual-assets/images', data);
    return response.data;
  },

  // Approve visual asset
  approve: async (assetId: string) => {
    const response = await api.post(`/api/visual-assets/${assetId}/approve`);
    return response.data;
  },

  // Reject visual asset
  reject: async (assetId: string, reason?: string) => {
    const response = await api.post(`/api/visual-assets/${assetId}/reject`, { reason });
    return response.data;
  },

  // Update visual asset metadata
  update: async (assetId: string, data: any) => {
    const response = await api.put(`/api/visual-assets/${assetId}`, data);
    return response.data;
  },

  // Delete visual asset
  remove: async (assetId: string) => {
    const response = await api.delete(`/api/visual-assets/${assetId}`);
    return response.data;
  },

  // Generate video from approved image
  generateVideo: async (data: {
    source_image_id: string;
    animation_prompt: string;
    duration: number;
    resolution: string;
  }) => {
    const response = await api.post('/api/visual-assets/videos', data);
    return response.data;
  },

  // Get video generation status
  getVideoStatus: async (assetId: string) => {
    const response = await api.get(`/api/visual-assets/videos/${assetId}/status`);
    return response.data;
  },
};

export default api;
