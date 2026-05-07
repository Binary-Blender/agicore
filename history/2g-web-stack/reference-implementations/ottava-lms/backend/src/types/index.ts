export interface User {
  id: string;
  email: string;
  password_hash: string;
  organization_id: string;
  department?: string;
  role: 'admin' | 'manager' | 'employee';
  preferred_genre?: string;
  created_at: Date;
  updated_at: Date;
}

export interface Video {
  id: string;
  title: string;
  description?: string;
  duration_seconds: number;
  transcript?: string;
  lyrics?: string;
  s3_url: string;
  thumbnail_url?: string;
  organization_id: string;
  genre?: string;
  training_module_id?: string;
  created_at: Date;
  updated_at: Date;
}

export interface Quiz {
  id: string;
  video_id: string;
  passing_score: number;
  questions: QuizQuestion[];
  created_at: Date;
  updated_at: Date;
}

export interface QuizQuestion {
  id: string;
  question: string;
  type: 'multiple_choice' | 'true_false' | 'fill_in_the_blank' | 'sequence_ordering';
  options?: string[];
  correct_answer: string | string[];
  points: number;
  hint?: string;
}

export interface WatchSession {
  id: string;
  user_id: string;
  video_id: string;
  started_at: Date;
  completed_at?: Date;
  watch_percentage: number;
  device_type?: string;
}

export interface QuizAttempt {
  id: string;
  user_id: string;
  video_id: string;
  quiz_id: string;
  score: number;
  passed: boolean;
  attempt_number: number;
  questions: QuizQuestion[];
  answers: Record<string, any>;
  completed_at: Date;
}

export interface Progress {
  user_id: string;
  video_id: string;
  status: 'not_started' | 'watching' | 'quiz_pending' | 'failed' | 'completed';
  watch_count: number;
  quiz_attempts: number;
  best_score: number;
  completed_at?: Date;
  last_activity: Date;
}

export interface VideoFavorite {
  id: string;
  user_id: string;
  video_id: string;
  created_at: Date;
}
