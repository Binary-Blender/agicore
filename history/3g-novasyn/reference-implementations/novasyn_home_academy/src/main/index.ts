import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import fs from 'fs';
import path from 'path';
import { createMainWindow } from './window';
import { getDatabase, closeDatabase, runMigrations } from './database/db';
import { IPC_CHANNELS } from '../shared/types';
import type {
  Student, CreateStudentInput,
  SchoolYear, CreateSchoolYearInput,
  Subject, CreateSubjectInput,
  Lesson, CreateLessonInput, GenerateLessonsInput,
  Attendance, AICostSummary,
  Skill, CreateSkillInput,
  Assessment, CreateAssessmentInput, GenerateAssessmentInput, AssessmentAnswer,
  ReadingEntry, CreateReadingEntryInput,
  ProgressData,
  TutorSession, CreateTutorSessionInput, SendTutorMessageInput, TutorMessage, TutorStreamChunk,
  Resource, CreateResourceInput, GenerateResourceInput,
  GamificationSettings, GamificationState, XPLogEntry, XPAwardResult, BadgeEarned, BadgeDefinition, StreakInfo,
  Goal, CreateGoalInput,
  GenerateMultiChildScheduleInput,
  ComplianceRequirement, ComplianceStatus,
  PortfolioItem, CreatePortfolioItemInput,
  GenerateReportCardInput, GenerateTranscriptInput, ReportCard, Transcript,
} from '../shared/types';
import { generateLessonPlan, generateAssessmentQuestions, streamTutorResponse, generateResourceContent, checkSafetyFilter, generateMultiChildSchedule, generateReportCard, generateTranscript, generateYearEndReport } from './services/aiService';
import { AVAILABLE_MODELS } from './models';
import { v4 as uuidv4 } from 'uuid';
import {
  initVault, closeVaultDatabase,
  vaultStore, vaultGet, vaultList, vaultDelete, vaultSearch,
  vaultGetTags, vaultAddTag, vaultAnnotate, vaultGetAnnotations, vaultGetProvenance,
} from './vault/vaultService';
import {
  registerMacros, unregisterMacros, getRegistry, getAvailableMacros,
} from './vault/macroRegistry';
import {
  startQueueWatcher, stopQueueWatcher, sendMacroRequest, checkMacroResponse, getPendingRequests,
} from './vault/queueWatcher';
import {
  listOrchestrations, getOrchestration, createOrchestration, updateOrchestration, deleteOrchestration,
  listRuns, getRun, runOrchestration, resumeOrchestration,
} from './vault/orchestrationEngine';

// Handle creating/removing shortcuts on Windows when installing/uninstalling
if (require('electron-squirrel-startup')) {
  app.quit();
}

// Single instance lock
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    const mainWindow = BrowserWindow.getAllWindows()[0];
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

// ─── API Key Store (shared with NovaSyn AI, Studio, Writer) ───────────────────

function getApiKeysPath(): string {
  const appData = process.env.APPDATA || app.getPath('userData');
  return path.join(appData, 'NovaSyn', 'api-keys.json');
}

function loadApiKeys(): Record<string, string> {
  try {
    const data = fs.readFileSync(getApiKeysPath(), 'utf-8');
    return JSON.parse(data);
  } catch {
    return {};
  }
}

// ─── Settings ─────────────────────────────────────────────────────────────────

function getSettingsPath(): string {
  const appData = process.env.APPDATA || app.getPath('userData');
  return path.join(appData, 'NovaSyn', 'academy-settings.json');
}

function loadSettings() {
  try {
    const data = fs.readFileSync(getSettingsPath(), 'utf-8');
    return JSON.parse(data);
  } catch {
    return {
      theme: 'dark',
      defaultModel: 'claude-sonnet-4-20250514',
    };
  }
}

function saveSettings(updates: object) {
  const current = loadSettings();
  const merged = { ...current, ...updates };
  const dir = path.dirname(getSettingsPath());
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(getSettingsPath(), JSON.stringify(merged, null, 2));
  return merged;
}

// ─── Row Mappers ──────────────────────────────────────────────────────────────

function mapStudent(row: any): Student {
  return {
    id: row.id,
    name: row.name,
    birthDate: row.birth_date || null,
    gradeLevel: row.grade_level || null,
    state: row.state || null,
    avatarEmoji: row.avatar_emoji || '🎓',
    interests: JSON.parse(row.interests || '[]'),
    learningStyle: JSON.parse(row.learning_style || '{}'),
    strengths: JSON.parse(row.strengths || '[]'),
    struggles: JSON.parse(row.struggles || '[]'),
    notes: row.notes || '',
    teachingPhilosophy: row.teaching_philosophy || 'eclectic',
    isActive: !!row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapSchoolYear(row: any): SchoolYear {
  return {
    id: row.id,
    studentId: row.student_id,
    name: row.name,
    startDate: row.start_date,
    endDate: row.end_date,
    targetSchoolDays: row.target_school_days || 180,
    actualSchoolDays: row.actual_school_days || 0,
    isCurrent: !!row.is_current,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapSubject(row: any): Subject {
  return {
    id: row.id,
    studentId: row.student_id,
    schoolYearId: row.school_year_id,
    name: row.name,
    color: row.color || '#4c6ef5',
    targetHoursPerWeek: row.target_hours_per_week || 5.0,
    actualHours: row.actual_hours || 0,
    philosophy: row.philosophy || null,
    notes: row.notes || '',
    sortOrder: row.sort_order || 0,
    isActive: !!row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapLesson(row: any): Lesson {
  return {
    id: row.id,
    studentId: row.student_id,
    subjectId: row.subject_id,
    schoolYearId: row.school_year_id,
    title: row.title,
    description: row.description || '',
    scheduledDate: row.scheduled_date || null,
    estimatedMinutes: row.estimated_minutes || 30,
    actualMinutes: row.actual_minutes || null,
    lessonContent: row.lesson_content || '',
    materialsNeeded: JSON.parse(row.materials_needed || '[]'),
    objectives: JSON.parse(row.objectives || '[]'),
    status: row.status || 'planned',
    completionNotes: row.completion_notes || '',
    sortOrder: row.sort_order || 0,
    aiGenerated: !!row.ai_generated,
    modelUsed: row.model_used || null,
    generationCost: row.generation_cost || 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapAttendance(row: any): Attendance {
  return {
    id: row.id,
    studentId: row.student_id,
    schoolYearId: row.school_year_id,
    date: row.date,
    status: row.status || 'present',
    totalMinutes: row.total_minutes || 0,
    subjectsCompleted: JSON.parse(row.subjects_completed || '[]'),
    notes: row.notes || '',
    createdAt: row.created_at,
  };
}

function mapSkill(row: any): Skill {
  return {
    id: row.id,
    studentId: row.student_id,
    subjectId: row.subject_id,
    name: row.name,
    proficiency: row.proficiency || 1,
    notes: row.notes || '',
    timesPracticed: row.times_practiced || 0,
    lastPracticed: row.last_practiced || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapAssessment(row: any): Assessment {
  return {
    id: row.id,
    studentId: row.student_id,
    subjectId: row.subject_id,
    schoolYearId: row.school_year_id,
    title: row.title,
    assessmentType: row.assessment_type || 'quiz',
    questions: JSON.parse(row.questions || '[]'),
    answers: JSON.parse(row.answers || '[]'),
    totalPoints: row.total_points || 0,
    earnedPoints: row.earned_points || 0,
    scorePercent: row.score_percent ?? null,
    status: row.status || 'pending',
    gradedAt: row.graded_at || null,
    notes: row.notes || '',
    aiGenerated: !!row.ai_generated,
    modelUsed: row.model_used || null,
    generationCost: row.generation_cost || 0,
    lessonIds: JSON.parse(row.lesson_ids || '[]'),
    skillIds: JSON.parse(row.skill_ids || '[]'),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapTutorSession(row: any): TutorSession {
  return {
    id: row.id,
    studentId: row.student_id,
    subjectId: row.subject_id || null,
    schoolYearId: row.school_year_id,
    topic: row.topic,
    mode: row.mode || 'guided',
    status: row.status || 'active',
    totalMessages: row.total_messages || 0,
    studentMessages: row.student_messages || 0,
    questionsAsked: row.questions_asked || 0,
    correctAnswers: row.correct_answers || 0,
    safetyAlerts: row.safety_alerts || 0,
    contentFlags: row.content_flags || 0,
    redirections: row.redirections || 0,
    durationSeconds: row.duration_seconds || 0,
    aiSummary: row.ai_summary || '',
    modelUsed: row.model_used || null,
    totalCost: row.total_cost || 0,
    startedAt: row.started_at,
    endedAt: row.ended_at || null,
    createdAt: row.created_at,
  };
}

function mapTutorMessage(row: any): TutorMessage {
  return {
    id: row.id,
    sessionId: row.session_id,
    role: row.role,
    content: row.content,
    filtered: !!row.filtered,
    filterReason: row.filter_reason || null,
    tokensIn: row.tokens_in || 0,
    tokensOut: row.tokens_out || 0,
    cost: row.cost || 0,
    createdAt: row.created_at,
  };
}

function mapGamificationSettings(row: any): GamificationSettings {
  return {
    id: row.id,
    studentId: row.student_id,
    enabled: !!row.enabled,
    theme: row.theme || 'medieval_quest',
    xpCompleteLesson: row.xp_complete_lesson ?? 15,
    xpAssessmentPass: row.xp_assessment_pass ?? 25,
    xpAssessmentPerfect: row.xp_assessment_perfect ?? 50,
    xpCompleteDaily: row.xp_complete_daily ?? 30,
    xpReadingSession: row.xp_reading_session ?? 10,
    xpStreakDay: row.xp_streak_day ?? 5,
    xpBonusChallenge: row.xp_bonus_challenge ?? 50,
    xpHelpSibling: row.xp_help_sibling ?? 20,
    showXpNumbers: !!row.show_xp_numbers,
    showSkillTree: !!row.show_skill_tree,
    showStreak: !!row.show_streak,
    showBadges: !!row.show_badges,
    badgesMath: !!row.badges_math,
    badgesReading: !!row.badges_reading,
    badgesStreak: !!row.badges_streak,
    badgesSubject: !!row.badges_subject,
    badgesSpecial: !!row.badges_special,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapXPLogEntry(row: any): XPLogEntry {
  return {
    id: row.id,
    studentId: row.student_id,
    amount: row.amount,
    reason: row.reason,
    category: row.category || 'general',
    metadata: JSON.parse(row.metadata || '{}'),
    createdAt: row.created_at,
  };
}

function mapBadgeEarned(row: any): BadgeEarned {
  return {
    id: row.id,
    studentId: row.student_id,
    badgeId: row.badge_id,
    badgeName: row.badge_name,
    badgeIcon: row.badge_icon,
    badgeDescription: row.badge_description || '',
    badgeCategory: row.badge_category || 'general',
    earnedAt: row.earned_at,
  };
}

function mapGoal(row: any): Goal {
  return {
    id: row.id,
    studentId: row.student_id,
    title: row.title,
    goalType: row.goal_type || 'weekly',
    targetXp: row.target_xp,
    earnedXp: row.earned_xp || 0,
    rewardText: row.reward_text || '',
    status: row.status || 'active',
    startDate: row.start_date,
    endDate: row.end_date,
    completedAt: row.completed_at || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapComplianceRequirement(row: any): ComplianceRequirement {
  return {
    id: row.id,
    state: row.state,
    requirementType: row.requirement_type,
    description: row.description,
    isRequired: !!row.is_required,
    details: JSON.parse(row.details || '{}'),
    sourceUrl: row.source_url || '',
    lastVerified: row.last_verified || null,
    createdAt: row.created_at,
  };
}

function mapComplianceStatus(row: any): ComplianceStatus {
  return {
    id: row.id,
    studentId: row.student_id,
    schoolYearId: row.school_year_id,
    complianceId: row.compliance_id,
    status: row.status || 'not_started',
    completionDate: row.completion_date || null,
    notes: row.notes || '',
    documentationPath: row.documentation_path || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapPortfolioItem(row: any): PortfolioItem {
  return {
    id: row.id,
    studentId: row.student_id,
    schoolYearId: row.school_year_id,
    subjectId: row.subject_id || null,
    lessonId: row.lesson_id || null,
    assessmentId: row.assessment_id || null,
    title: row.title,
    description: row.description || '',
    itemType: row.item_type,
    filePath: row.file_path || '',
    content: row.content || '',
    tags: JSON.parse(row.tags || '[]'),
    notes: row.notes || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ─── Gamification Engine ──────────────────────────────────────────────────────

const LEVEL_THRESHOLDS = [
  { level: 1, xp: 0, name: 'Beginner' },
  { level: 2, xp: 100, name: 'Learner' },
  { level: 3, xp: 250, name: 'Student' },
  { level: 4, xp: 500, name: 'Scholar' },
  { level: 5, xp: 800, name: 'Explorer' },
  { level: 6, xp: 1200, name: 'Adventurer' },
  { level: 7, xp: 1700, name: 'Champion' },
  { level: 8, xp: 2500, name: 'Hero' },
  { level: 9, xp: 3500, name: 'Legend' },
  { level: 10, xp: 5000, name: 'Master' },
];

function getLevelInfo(totalXp: number): { level: number; levelName: string; xpToNextLevel: number } {
  let current = LEVEL_THRESHOLDS[0];
  for (const t of LEVEL_THRESHOLDS) {
    if (totalXp >= t.xp) current = t;
    else break;
  }
  const nextLevel = LEVEL_THRESHOLDS.find(t => t.xp > totalXp);
  return {
    level: current.level,
    levelName: current.name,
    xpToNextLevel: nextLevel ? nextLevel.xp - totalXp : 0,
  };
}

function getOrCreateGamificationSettings(db: any, studentId: string): GamificationSettings {
  let row = db.prepare('SELECT * FROM academy_gamification_settings WHERE student_id = ?').get(studentId);
  if (!row) {
    const id = uuidv4();
    const now = new Date().toISOString();
    db.prepare(`INSERT INTO academy_gamification_settings (id, student_id, created_at, updated_at) VALUES (?, ?, ?, ?)`).run(id, studentId, now, now);
    row = db.prepare('SELECT * FROM academy_gamification_settings WHERE student_id = ?').get(studentId);
  }
  return mapGamificationSettings(row);
}

function getOrCreateStreak(db: any, studentId: string): StreakInfo {
  let row = db.prepare('SELECT * FROM academy_streaks WHERE student_id = ?').get(studentId) as any;
  if (!row) {
    const id = uuidv4();
    const now = new Date().toISOString();
    db.prepare(`INSERT INTO academy_streaks (id, student_id, created_at, updated_at) VALUES (?, ?, ?, ?)`).run(id, studentId, now, now);
    row = db.prepare('SELECT * FROM academy_streaks WHERE student_id = ?').get(studentId);
  }
  return {
    currentStreak: row.current_streak || 0,
    longestStreak: row.longest_streak || 0,
    lastSchoolDate: row.last_school_date || null,
  };
}

function getTotalXp(db: any, studentId: string): number {
  const result = db.prepare('SELECT COALESCE(SUM(amount), 0) as total FROM academy_xp_log WHERE student_id = ?').get(studentId) as any;
  return result.total || 0;
}

const BADGE_DEFINITIONS: BadgeDefinition[] = [
  { id: 'math_pro', name: 'Math Pro', icon: '🔢', description: 'Score 90%+ on 5 math assessments', category: 'math' },
  { id: 'bookworm', name: 'Bookworm', icon: '📚', description: 'Read 10 books', category: 'reading' },
  { id: 'science_kid', name: 'Science Kid', icon: '🔬', description: 'Complete 20 science lessons', category: 'subject' },
  { id: 'writer', name: 'Writer', icon: '✏️', description: 'Complete 20 writing lessons', category: 'subject' },
  { id: 'streak_3', name: '3-Day Streak', icon: '🔥', description: 'Learn 3 days in a row', category: 'streak' },
  { id: 'streak_7', name: 'Week Warrior', icon: '🔥', description: 'Learn 7 days in a row', category: 'streak' },
  { id: 'streak_30', name: 'Monthly Master', icon: '🔥', description: 'Learn 30 days in a row', category: 'streak' },
  { id: 'first_lesson', name: 'First Steps', icon: '👣', description: 'Complete your first lesson', category: 'special' },
  { id: 'first_assessment', name: 'Test Taker', icon: '📝', description: 'Complete your first assessment', category: 'special' },
  { id: 'xp_100', name: 'Century', icon: '💯', description: 'Earn 100 total XP', category: 'special' },
  { id: 'xp_500', name: 'Half Thousand', icon: '⭐', description: 'Earn 500 total XP', category: 'special' },
  { id: 'xp_1000', name: 'Thousand Club', icon: '🏆', description: 'Earn 1,000 total XP', category: 'special' },
  { id: 'perfect_score', name: 'Perfect Score', icon: '💎', description: 'Get 100% on an assessment', category: 'special' },
  { id: 'all_daily', name: 'Daily Champion', icon: '🌟', description: 'Complete all daily lessons', category: 'special' },
];

function checkAndAwardBadges(db: any, studentId: string): BadgeEarned[] {
  const settings = getOrCreateGamificationSettings(db, studentId);
  if (!settings.enabled) return [];

  const earned = db.prepare('SELECT badge_id FROM academy_badges_earned WHERE student_id = ?').all(studentId) as any[];
  const earnedIds = new Set(earned.map((e: any) => e.badge_id));
  const newBadges: BadgeEarned[] = [];
  const now = new Date().toISOString();
  const totalXp = getTotalXp(db, studentId);
  const streak = getOrCreateStreak(db, studentId);

  for (const badge of BADGE_DEFINITIONS) {
    if (earnedIds.has(badge.id)) continue;

    // Check category toggles
    if (badge.category === 'math' && !settings.badgesMath) continue;
    if (badge.category === 'reading' && !settings.badgesReading) continue;
    if (badge.category === 'streak' && !settings.badgesStreak) continue;
    if (badge.category === 'subject' && !settings.badgesSubject) continue;
    if (badge.category === 'special' && !settings.badgesSpecial) continue;

    let earned = false;
    switch (badge.id) {
      case 'first_lesson': {
        const count = (db.prepare(`SELECT COUNT(*) as c FROM academy_lessons WHERE student_id = ? AND status = 'completed'`).get(studentId) as any).c;
        earned = count >= 1;
        break;
      }
      case 'first_assessment': {
        const count = (db.prepare(`SELECT COUNT(*) as c FROM academy_assessments WHERE student_id = ? AND status = 'graded'`).get(studentId) as any).c;
        earned = count >= 1;
        break;
      }
      case 'bookworm': {
        const count = (db.prepare(`SELECT COUNT(*) as c FROM academy_reading_log WHERE student_id = ? AND status = 'completed'`).get(studentId) as any).c;
        earned = count >= 10;
        break;
      }
      case 'math_pro': {
        const count = (db.prepare(`SELECT COUNT(*) as c FROM academy_assessments a JOIN academy_subjects s ON a.subject_id = s.id WHERE a.student_id = ? AND LOWER(s.name) LIKE '%math%' AND a.score_percent >= 90`).get(studentId) as any).c;
        earned = count >= 5;
        break;
      }
      case 'science_kid': {
        const count = (db.prepare(`SELECT COUNT(*) as c FROM academy_lessons l JOIN academy_subjects s ON l.subject_id = s.id WHERE l.student_id = ? AND LOWER(s.name) LIKE '%science%' AND l.status = 'completed'`).get(studentId) as any).c;
        earned = count >= 20;
        break;
      }
      case 'writer': {
        const count = (db.prepare(`SELECT COUNT(*) as c FROM academy_lessons l JOIN academy_subjects s ON l.subject_id = s.id WHERE l.student_id = ? AND LOWER(s.name) LIKE '%writ%' AND l.status = 'completed'`).get(studentId) as any).c;
        earned = count >= 20;
        break;
      }
      case 'streak_3': earned = streak.currentStreak >= 3; break;
      case 'streak_7': earned = streak.currentStreak >= 7; break;
      case 'streak_30': earned = streak.currentStreak >= 30; break;
      case 'xp_100': earned = totalXp >= 100; break;
      case 'xp_500': earned = totalXp >= 500; break;
      case 'xp_1000': earned = totalXp >= 1000; break;
      case 'perfect_score': {
        const count = (db.prepare(`SELECT COUNT(*) as c FROM academy_assessments WHERE student_id = ? AND score_percent = 100`).get(studentId) as any).c;
        earned = count >= 1;
        break;
      }
      case 'all_daily': {
        // Check if any day has all lessons completed
        const today = new Date().toISOString().split('T')[0];
        const totalToday = (db.prepare(`SELECT COUNT(*) as c FROM academy_lessons WHERE student_id = ? AND scheduled_date = ?`).get(studentId, today) as any).c;
        const completedToday = (db.prepare(`SELECT COUNT(*) as c FROM academy_lessons WHERE student_id = ? AND scheduled_date = ? AND status = 'completed'`).get(studentId, today) as any).c;
        earned = totalToday > 0 && totalToday === completedToday;
        break;
      }
    }

    if (earned) {
      const badgeRowId = uuidv4();
      db.prepare(`INSERT INTO academy_badges_earned (id, student_id, badge_id, badge_name, badge_icon, badge_description, badge_category, earned_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(
        badgeRowId, studentId, badge.id, badge.name, badge.icon, badge.description, badge.category, now,
      );
      newBadges.push(mapBadgeEarned(db.prepare('SELECT * FROM academy_badges_earned WHERE id = ?').get(badgeRowId)));
    }
  }

  return newBadges;
}

function awardXpInternal(db: any, studentId: string, amount: number, reason: string, category: string): XPAwardResult {
  const settings = getOrCreateGamificationSettings(db, studentId);
  if (!settings.enabled) {
    return { xpAwarded: 0, newTotal: 0, levelUp: null, newBadges: [], goalCompleted: null, streak: getOrCreateStreak(db, studentId) };
  }

  const now = new Date().toISOString();
  const oldTotal = getTotalXp(db, studentId);
  const oldLevel = getLevelInfo(oldTotal);

  // Award XP
  const logId = uuidv4();
  db.prepare(`INSERT INTO academy_xp_log (id, student_id, amount, reason, category, created_at) VALUES (?, ?, ?, ?, ?, ?)`).run(logId, studentId, amount, reason, category, now);

  const newTotal = oldTotal + amount;
  const newLevel = getLevelInfo(newTotal);

  const levelUp = newLevel.level > oldLevel.level ? { newLevel: newLevel.level, newLevelName: newLevel.levelName } : null;

  // Check badges
  const newBadges = checkAndAwardBadges(db, studentId);

  // Update active goals
  let goalCompleted: Goal | null = null;
  const activeGoals = db.prepare(`SELECT * FROM academy_goals WHERE student_id = ? AND status = 'active'`).all(studentId) as any[];
  for (const goal of activeGoals) {
    const goalXp = (db.prepare(`SELECT COALESCE(SUM(amount), 0) as total FROM academy_xp_log WHERE student_id = ? AND created_at >= ? AND created_at <= ?`).get(studentId, goal.start_date, goal.end_date + 'T23:59:59') as any).total;

    db.prepare(`UPDATE academy_goals SET earned_xp = ?, updated_at = ? WHERE id = ?`).run(goalXp, now, goal.id);

    if (goalXp >= goal.target_xp && goal.status === 'active') {
      db.prepare(`UPDATE academy_goals SET status = 'completed', completed_at = ?, updated_at = ? WHERE id = ?`).run(now, now, goal.id);
      goalCompleted = mapGoal(db.prepare('SELECT * FROM academy_goals WHERE id = ?').get(goal.id));
    }
  }

  const streak = getOrCreateStreak(db, studentId);

  return { xpAwarded: amount, newTotal, levelUp, newBadges, goalCompleted, streak };
}

function mapResource(row: any): Resource {
  return {
    id: row.id,
    studentId: row.student_id,
    subjectId: row.subject_id || null,
    schoolYearId: row.school_year_id,
    title: row.title,
    resourceType: row.resource_type,
    topic: row.topic || '',
    difficulty: row.difficulty || 'medium',
    content: row.content || '',
    answerKey: row.answer_key || '',
    aiGenerated: !!row.ai_generated,
    modelUsed: row.model_used || null,
    generationCost: row.generation_cost || 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapReadingEntry(row: any): ReadingEntry {
  return {
    id: row.id,
    studentId: row.student_id,
    schoolYearId: row.school_year_id,
    title: row.title,
    author: row.author || '',
    genre: row.genre || '',
    totalPages: row.total_pages ?? null,
    pagesRead: row.pages_read || 0,
    status: row.status || 'reading',
    startDate: row.start_date || null,
    finishDate: row.finish_date || null,
    totalMinutes: row.total_minutes || 0,
    rating: row.rating ?? null,
    review: row.review || '',
    notes: row.notes || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ─── App Lifecycle ────────────────────────────────────────────────────────────

app.whenReady().then(() => {
  runMigrations();
  initVault();
  registerMacros();
  startQueueWatcher();
  createMainWindow();
});

app.on('window-all-closed', () => {
  stopQueueWatcher();
  unregisterMacros();
  closeVaultDatabase();
  closeDatabase();
  app.quit();
});

// ─── IPC Handlers: Settings ──────────────────────────────────────────────────

ipcMain.handle(IPC_CHANNELS.GET_SETTINGS, () => {
  return loadSettings();
});

ipcMain.handle(IPC_CHANNELS.SAVE_SETTINGS, (_event, updates) => {
  return saveSettings(updates);
});

ipcMain.handle(IPC_CHANNELS.GET_API_KEYS, () => {
  return loadApiKeys();
});

ipcMain.handle(IPC_CHANNELS.GET_MODELS, () => {
  return AVAILABLE_MODELS;
});

// ─── IPC Handlers: Students ─────────────────────────────────────────────────

ipcMain.handle(IPC_CHANNELS.GET_STUDENTS, () => {
  const db = getDatabase();
  const rows = db.prepare('SELECT * FROM academy_students WHERE is_active = 1 ORDER BY name').all();
  return rows.map(mapStudent);
});

ipcMain.handle(IPC_CHANNELS.CREATE_STUDENT, (_event, input: CreateStudentInput) => {
  const db = getDatabase();
  const id = uuidv4();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO academy_students (id, name, birth_date, grade_level, state, avatar_emoji, interests, learning_style, strengths, struggles, notes, teaching_philosophy, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    input.name,
    input.birthDate || null,
    input.gradeLevel || null,
    input.state || null,
    input.avatarEmoji || '🎓',
    JSON.stringify(input.interests || []),
    JSON.stringify(input.learningStyle || {}),
    JSON.stringify(input.strengths || []),
    JSON.stringify(input.struggles || []),
    input.notes || '',
    input.teachingPhilosophy || 'eclectic',
    now,
    now,
  );

  const row = db.prepare('SELECT * FROM academy_students WHERE id = ?').get(id);
  return mapStudent(row);
});

ipcMain.handle(IPC_CHANNELS.UPDATE_STUDENT, (_event, id: string, updates: Partial<Student>) => {
  const db = getDatabase();
  const now = new Date().toISOString();

  const fields: string[] = [];
  const values: any[] = [];

  if (updates.name !== undefined) { fields.push('name = ?'); values.push(updates.name); }
  if (updates.birthDate !== undefined) { fields.push('birth_date = ?'); values.push(updates.birthDate); }
  if (updates.gradeLevel !== undefined) { fields.push('grade_level = ?'); values.push(updates.gradeLevel); }
  if (updates.state !== undefined) { fields.push('state = ?'); values.push(updates.state); }
  if (updates.avatarEmoji !== undefined) { fields.push('avatar_emoji = ?'); values.push(updates.avatarEmoji); }
  if (updates.interests !== undefined) { fields.push('interests = ?'); values.push(JSON.stringify(updates.interests)); }
  if (updates.learningStyle !== undefined) { fields.push('learning_style = ?'); values.push(JSON.stringify(updates.learningStyle)); }
  if (updates.strengths !== undefined) { fields.push('strengths = ?'); values.push(JSON.stringify(updates.strengths)); }
  if (updates.struggles !== undefined) { fields.push('struggles = ?'); values.push(JSON.stringify(updates.struggles)); }
  if (updates.notes !== undefined) { fields.push('notes = ?'); values.push(updates.notes); }
  if (updates.teachingPhilosophy !== undefined) { fields.push('teaching_philosophy = ?'); values.push(updates.teachingPhilosophy); }

  fields.push('updated_at = ?');
  values.push(now);
  values.push(id);

  db.prepare(`UPDATE academy_students SET ${fields.join(', ')} WHERE id = ?`).run(...values);

  const row = db.prepare('SELECT * FROM academy_students WHERE id = ?').get(id);
  return mapStudent(row);
});

ipcMain.handle(IPC_CHANNELS.DELETE_STUDENT, (_event, id: string) => {
  const db = getDatabase();
  db.prepare('UPDATE academy_students SET is_active = 0, updated_at = ? WHERE id = ?').run(new Date().toISOString(), id);
});

// ─── IPC Handlers: School Years ──────────────────────────────────────────────

ipcMain.handle(IPC_CHANNELS.GET_SCHOOL_YEARS, (_event, studentId: string) => {
  const db = getDatabase();
  const rows = db.prepare('SELECT * FROM academy_school_years WHERE student_id = ? ORDER BY start_date DESC').all(studentId);
  return rows.map(mapSchoolYear);
});

ipcMain.handle(IPC_CHANNELS.CREATE_SCHOOL_YEAR, (_event, input: CreateSchoolYearInput) => {
  const db = getDatabase();
  const id = uuidv4();
  const now = new Date().toISOString();

  // Set all other years for this student to not current
  db.prepare('UPDATE academy_school_years SET is_current = 0 WHERE student_id = ?').run(input.studentId);

  db.prepare(`
    INSERT INTO academy_school_years (id, student_id, name, start_date, end_date, target_school_days, is_current, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)
  `).run(id, input.studentId, input.name, input.startDate, input.endDate, input.targetSchoolDays || 180, now, now);

  const row = db.prepare('SELECT * FROM academy_school_years WHERE id = ?').get(id);
  return mapSchoolYear(row);
});

ipcMain.handle(IPC_CHANNELS.UPDATE_SCHOOL_YEAR, (_event, id: string, updates: Partial<SchoolYear>) => {
  const db = getDatabase();
  const now = new Date().toISOString();

  const fields: string[] = [];
  const values: any[] = [];

  if (updates.name !== undefined) { fields.push('name = ?'); values.push(updates.name); }
  if (updates.startDate !== undefined) { fields.push('start_date = ?'); values.push(updates.startDate); }
  if (updates.endDate !== undefined) { fields.push('end_date = ?'); values.push(updates.endDate); }
  if (updates.targetSchoolDays !== undefined) { fields.push('target_school_days = ?'); values.push(updates.targetSchoolDays); }
  if (updates.actualSchoolDays !== undefined) { fields.push('actual_school_days = ?'); values.push(updates.actualSchoolDays); }
  if (updates.isCurrent !== undefined) { fields.push('is_current = ?'); values.push(updates.isCurrent ? 1 : 0); }

  fields.push('updated_at = ?');
  values.push(now);
  values.push(id);

  db.prepare(`UPDATE academy_school_years SET ${fields.join(', ')} WHERE id = ?`).run(...values);

  const row = db.prepare('SELECT * FROM academy_school_years WHERE id = ?').get(id);
  return mapSchoolYear(row);
});

ipcMain.handle(IPC_CHANNELS.DELETE_SCHOOL_YEAR, (_event, id: string) => {
  const db = getDatabase();
  db.prepare('DELETE FROM academy_school_years WHERE id = ?').run(id);
});

// ─── IPC Handlers: Subjects ─────────────────────────────────────────────────

ipcMain.handle(IPC_CHANNELS.GET_SUBJECTS, (_event, studentId: string) => {
  const db = getDatabase();
  const currentYear = db.prepare('SELECT id FROM academy_school_years WHERE student_id = ? AND is_current = 1').get(studentId) as any;
  if (!currentYear) return [];

  const rows = db.prepare('SELECT * FROM academy_subjects WHERE student_id = ? AND school_year_id = ? AND is_active = 1 ORDER BY sort_order, name').all(studentId, currentYear.id);
  return rows.map(mapSubject);
});

ipcMain.handle(IPC_CHANNELS.CREATE_SUBJECT, (_event, input: CreateSubjectInput) => {
  const db = getDatabase();
  const id = uuidv4();
  const now = new Date().toISOString();

  const maxOrder = db.prepare('SELECT MAX(sort_order) as max_order FROM academy_subjects WHERE student_id = ? AND school_year_id = ?').get(input.studentId, input.schoolYearId) as any;

  db.prepare(`
    INSERT INTO academy_subjects (id, student_id, school_year_id, name, color, target_hours_per_week, philosophy, sort_order, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, input.studentId, input.schoolYearId, input.name, input.color || '#4c6ef5', input.targetHoursPerWeek || 5.0, input.philosophy || null, (maxOrder?.max_order || 0) + 1, now, now);

  const row = db.prepare('SELECT * FROM academy_subjects WHERE id = ?').get(id);
  return mapSubject(row);
});

ipcMain.handle(IPC_CHANNELS.UPDATE_SUBJECT, (_event, id: string, updates: Partial<Subject>) => {
  const db = getDatabase();
  const now = new Date().toISOString();

  const fields: string[] = [];
  const values: any[] = [];

  if (updates.name !== undefined) { fields.push('name = ?'); values.push(updates.name); }
  if (updates.color !== undefined) { fields.push('color = ?'); values.push(updates.color); }
  if (updates.targetHoursPerWeek !== undefined) { fields.push('target_hours_per_week = ?'); values.push(updates.targetHoursPerWeek); }
  if (updates.actualHours !== undefined) { fields.push('actual_hours = ?'); values.push(updates.actualHours); }
  if (updates.philosophy !== undefined) { fields.push('philosophy = ?'); values.push(updates.philosophy); }
  if (updates.notes !== undefined) { fields.push('notes = ?'); values.push(updates.notes); }
  if (updates.sortOrder !== undefined) { fields.push('sort_order = ?'); values.push(updates.sortOrder); }

  fields.push('updated_at = ?');
  values.push(now);
  values.push(id);

  db.prepare(`UPDATE academy_subjects SET ${fields.join(', ')} WHERE id = ?`).run(...values);

  const row = db.prepare('SELECT * FROM academy_subjects WHERE id = ?').get(id);
  return mapSubject(row);
});

ipcMain.handle(IPC_CHANNELS.DELETE_SUBJECT, (_event, id: string) => {
  const db = getDatabase();
  db.prepare('UPDATE academy_subjects SET is_active = 0, updated_at = ? WHERE id = ?').run(new Date().toISOString(), id);
});

// ─── IPC Handlers: Lessons ──────────────────────────────────────────────────

ipcMain.handle(IPC_CHANNELS.GET_LESSONS, (_event, filters: { studentId: string; date?: string; subjectId?: string }) => {
  const db = getDatabase();
  let query = 'SELECT * FROM academy_lessons WHERE student_id = ?';
  const params: any[] = [filters.studentId];

  if (filters.date) {
    query += ' AND scheduled_date = ?';
    params.push(filters.date);
  }
  if (filters.subjectId) {
    query += ' AND subject_id = ?';
    params.push(filters.subjectId);
  }

  query += ' ORDER BY scheduled_date, sort_order, created_at';
  const rows = db.prepare(query).all(...params);
  return rows.map(mapLesson);
});

ipcMain.handle(IPC_CHANNELS.CREATE_LESSON, (_event, input: CreateLessonInput) => {
  const db = getDatabase();
  const id = uuidv4();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO academy_lessons (id, student_id, subject_id, school_year_id, title, description, scheduled_date, estimated_minutes, lesson_content, materials_needed, objectives, sort_order, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, input.studentId, input.subjectId, input.schoolYearId,
    input.title, input.description || '', input.scheduledDate || null,
    input.estimatedMinutes || 30, input.lessonContent || '',
    JSON.stringify(input.materialsNeeded || []),
    JSON.stringify(input.objectives || []),
    input.sortOrder || 0, now, now,
  );

  const row = db.prepare('SELECT * FROM academy_lessons WHERE id = ?').get(id);
  return mapLesson(row);
});

ipcMain.handle(IPC_CHANNELS.UPDATE_LESSON, (_event, id: string, updates: Partial<Lesson>) => {
  const db = getDatabase();
  const now = new Date().toISOString();

  const fields: string[] = [];
  const values: any[] = [];

  if (updates.title !== undefined) { fields.push('title = ?'); values.push(updates.title); }
  if (updates.description !== undefined) { fields.push('description = ?'); values.push(updates.description); }
  if (updates.scheduledDate !== undefined) { fields.push('scheduled_date = ?'); values.push(updates.scheduledDate); }
  if (updates.estimatedMinutes !== undefined) { fields.push('estimated_minutes = ?'); values.push(updates.estimatedMinutes); }
  if (updates.actualMinutes !== undefined) { fields.push('actual_minutes = ?'); values.push(updates.actualMinutes); }
  if (updates.lessonContent !== undefined) { fields.push('lesson_content = ?'); values.push(updates.lessonContent); }
  if (updates.materialsNeeded !== undefined) { fields.push('materials_needed = ?'); values.push(JSON.stringify(updates.materialsNeeded)); }
  if (updates.objectives !== undefined) { fields.push('objectives = ?'); values.push(JSON.stringify(updates.objectives)); }
  if (updates.status !== undefined) { fields.push('status = ?'); values.push(updates.status); }
  if (updates.completionNotes !== undefined) { fields.push('completion_notes = ?'); values.push(updates.completionNotes); }
  if (updates.sortOrder !== undefined) { fields.push('sort_order = ?'); values.push(updates.sortOrder); }

  fields.push('updated_at = ?');
  values.push(now);
  values.push(id);

  db.prepare(`UPDATE academy_lessons SET ${fields.join(', ')} WHERE id = ?`).run(...values);

  const row = db.prepare('SELECT * FROM academy_lessons WHERE id = ?').get(id);
  return mapLesson(row);
});

ipcMain.handle(IPC_CHANNELS.DELETE_LESSON, (_event, id: string) => {
  const db = getDatabase();
  db.prepare('DELETE FROM academy_lessons WHERE id = ?').run(id);
});

ipcMain.handle(IPC_CHANNELS.COMPLETE_LESSON, (_event, id: string, notes?: string, actualMinutes?: number) => {
  const db = getDatabase();
  const now = new Date().toISOString();

  // Get the lesson
  const lessonRow = db.prepare('SELECT * FROM academy_lessons WHERE id = ?').get(id) as any;
  if (!lessonRow) throw new Error('Lesson not found');

  const lesson = mapLesson(lessonRow);
  const minutes = actualMinutes || lesson.estimatedMinutes;

  // Update lesson status
  db.prepare(`
    UPDATE academy_lessons SET status = 'completed', actual_minutes = ?, completion_notes = ?, updated_at = ? WHERE id = ?
  `).run(minutes, notes || '', now, id);

  // Get subject name for attendance
  const subjectRow = db.prepare('SELECT name FROM academy_subjects WHERE id = ?').get(lesson.subjectId) as any;
  const subjectName = subjectRow?.name || 'Unknown';

  // Upsert attendance
  const today = lesson.scheduledDate || now.split('T')[0];
  const existingAttendance = db.prepare('SELECT * FROM academy_attendance WHERE student_id = ? AND date = ?').get(lesson.studentId, today) as any;

  if (existingAttendance) {
    const existingSubjects: string[] = JSON.parse(existingAttendance.subjects_completed || '[]');
    if (!existingSubjects.includes(subjectName)) {
      existingSubjects.push(subjectName);
    }
    db.prepare(`
      UPDATE academy_attendance SET total_minutes = total_minutes + ?, subjects_completed = ? WHERE id = ?
    `).run(minutes, JSON.stringify(existingSubjects), existingAttendance.id);
  } else {
    // First lesson completed today — create attendance and increment school days
    const attendanceId = uuidv4();
    db.prepare(`
      INSERT INTO academy_attendance (id, student_id, school_year_id, date, status, total_minutes, subjects_completed, created_at)
      VALUES (?, ?, ?, ?, 'present', ?, ?, ?)
    `).run(attendanceId, lesson.studentId, lesson.schoolYearId, today, minutes, JSON.stringify([subjectName]), now);

    // Increment actual school days
    db.prepare('UPDATE academy_school_years SET actual_school_days = actual_school_days + 1 WHERE id = ?').run(lesson.schoolYearId);
  }

  // Update subject actual hours
  db.prepare('UPDATE academy_subjects SET actual_hours = actual_hours + ? WHERE id = ?').run(minutes / 60, lesson.subjectId);

  // Auto-award XP for lesson completion
  const gamSettings = getOrCreateGamificationSettings(db, lesson.studentId);
  if (gamSettings.enabled && gamSettings.xpCompleteLesson > 0) {
    awardXpInternal(db, lesson.studentId, gamSettings.xpCompleteLesson, `Completed: ${lesson.title}`, 'lesson');
  }

  // Check if all daily lessons are completed (daily champion XP)
  const dailyTotal = (db.prepare(`SELECT COUNT(*) as c FROM academy_lessons WHERE student_id = ? AND scheduled_date = ?`).get(lesson.studentId, today) as any).c;
  const dailyCompleted = (db.prepare(`SELECT COUNT(*) as c FROM academy_lessons WHERE student_id = ? AND scheduled_date = ? AND status = 'completed'`).get(lesson.studentId, today) as any).c;
  if (dailyTotal > 0 && dailyTotal === dailyCompleted && gamSettings.enabled && gamSettings.xpCompleteDaily > 0) {
    awardXpInternal(db, lesson.studentId, gamSettings.xpCompleteDaily, 'All daily lessons completed!', 'daily_complete');
  }

  // Update streak
  try {
    const streakToday = new Date().toISOString().split('T')[0];
    const streak = getOrCreateStreak(db, lesson.studentId);
    if (streak.lastSchoolDate !== streakToday) {
      // Streak update logic (simplified — full logic in UPDATE_STREAK handler)
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      const newStreak = streak.lastSchoolDate === yesterdayStr ? streak.currentStreak + 1 : 1;
      const longestStreak = Math.max(streak.longestStreak, newStreak);
      db.prepare('UPDATE academy_streaks SET current_streak = ?, longest_streak = ?, last_school_date = ?, updated_at = ? WHERE student_id = ?').run(newStreak, longestStreak, streakToday, now, lesson.studentId);
    }
  } catch {}

  // Check badges
  checkAndAwardBadges(db, lesson.studentId);

  const updatedRow = db.prepare('SELECT * FROM academy_lessons WHERE id = ?').get(id);
  return mapLesson(updatedRow);
});

ipcMain.handle(IPC_CHANNELS.GENERATE_LESSONS, async (_event, input: GenerateLessonsInput) => {
  const db = getDatabase();
  const apiKeys = loadApiKeys();
  const settings = loadSettings();
  const modelId = input.model || settings.defaultModel;

  // Load student
  const studentRow = db.prepare('SELECT * FROM academy_students WHERE id = ?').get(input.studentId) as any;
  if (!studentRow) throw new Error('Student not found');
  const student = mapStudent(studentRow);

  // Load current school year
  const yearRow = db.prepare('SELECT * FROM academy_school_years WHERE student_id = ? AND is_current = 1').get(input.studentId) as any;
  if (!yearRow) throw new Error('No current school year found');
  const schoolYear = mapSchoolYear(yearRow);

  // Load subjects (filter by input.subjectIds if provided)
  let subjectRows: any[];
  if (input.subjectIds && input.subjectIds.length > 0) {
    const placeholders = input.subjectIds.map(() => '?').join(',');
    subjectRows = db.prepare(`SELECT * FROM academy_subjects WHERE id IN (${placeholders}) AND is_active = 1`).all(...input.subjectIds);
  } else {
    subjectRows = db.prepare('SELECT * FROM academy_subjects WHERE student_id = ? AND school_year_id = ? AND is_active = 1').all(input.studentId, schoolYear.id);
  }
  const subjects = subjectRows.map(mapSubject);

  // Load recent completed lessons for context (last 5 per subject)
  const recentLessons: { subjectName: string; title: string }[] = [];
  for (const subject of subjects) {
    const recent = db.prepare(`
      SELECT title FROM academy_lessons WHERE subject_id = ? AND status = 'completed' ORDER BY updated_at DESC LIMIT 5
    `).all(subject.id) as any[];
    for (const r of recent) {
      recentLessons.push({ subjectName: subject.name, title: r.title });
    }
  }

  // Generate lessons via AI
  const { lessons: generatedLessons, response } = await generateLessonPlan(
    student, subjects, input.date, input.scope, recentLessons, modelId, apiKeys,
  );

  // Insert generated lessons into DB
  const createdLessons: Lesson[] = [];
  const now = new Date().toISOString();
  let sortOrder = 0;

  for (const gl of generatedLessons) {
    // Match subject by name
    const matchedSubject = subjects.find(s => s.name.toLowerCase() === gl.subjectName.toLowerCase());
    if (!matchedSubject) continue;

    const lessonId = uuidv4();
    db.prepare(`
      INSERT INTO academy_lessons (id, student_id, subject_id, school_year_id, title, description, scheduled_date, estimated_minutes, lesson_content, materials_needed, objectives, sort_order, ai_generated, model_used, generation_cost, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?)
    `).run(
      lessonId, input.studentId, matchedSubject.id, schoolYear.id,
      gl.title, gl.description, gl.scheduledDate, gl.estimatedMinutes,
      gl.lessonContent, JSON.stringify(gl.materialsNeeded), JSON.stringify(gl.objectives),
      sortOrder++, modelId, response.cost / generatedLessons.length,
      now, now,
    );

    const row = db.prepare('SELECT * FROM academy_lessons WHERE id = ?').get(lessonId);
    createdLessons.push(mapLesson(row));
  }

  // Log AI usage
  const logId = uuidv4();
  db.prepare(`
    INSERT INTO academy_ai_log (id, student_id, feature, model_used, tokens_in, tokens_out, cost, response_time_ms, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(logId, input.studentId, 'lesson_plan', modelId, response.tokensIn, response.tokensOut, response.cost, response.responseTimeMs, now);

  return createdLessons;
});

// ─── IPC Handlers: Attendance ────────────────────────────────────────────────

ipcMain.handle(IPC_CHANNELS.GET_ATTENDANCE, (_event, filters: { studentId: string; startDate?: string; endDate?: string }) => {
  const db = getDatabase();
  let query = 'SELECT * FROM academy_attendance WHERE student_id = ?';
  const params: any[] = [filters.studentId];

  if (filters.startDate) {
    query += ' AND date >= ?';
    params.push(filters.startDate);
  }
  if (filters.endDate) {
    query += ' AND date <= ?';
    params.push(filters.endDate);
  }

  query += ' ORDER BY date DESC';
  const rows = db.prepare(query).all(...params);
  return rows.map(mapAttendance);
});

ipcMain.handle(IPC_CHANNELS.UPDATE_ATTENDANCE, (_event, id: string, updates: Partial<Attendance>) => {
  const db = getDatabase();

  const fields: string[] = [];
  const values: any[] = [];

  if (updates.status !== undefined) { fields.push('status = ?'); values.push(updates.status); }
  if (updates.totalMinutes !== undefined) { fields.push('total_minutes = ?'); values.push(updates.totalMinutes); }
  if (updates.subjectsCompleted !== undefined) { fields.push('subjects_completed = ?'); values.push(JSON.stringify(updates.subjectsCompleted)); }
  if (updates.notes !== undefined) { fields.push('notes = ?'); values.push(updates.notes); }

  if (fields.length === 0) return;
  values.push(id);

  db.prepare(`UPDATE academy_attendance SET ${fields.join(', ')} WHERE id = ?`).run(...values);

  const row = db.prepare('SELECT * FROM academy_attendance WHERE id = ?').get(id);
  return mapAttendance(row);
});

// ─── IPC Handlers: AI Cost Summary ──────────────────────────────────────────

ipcMain.handle(IPC_CHANNELS.GET_AI_COST_SUMMARY, () => {
  const db = getDatabase();

  const totals = db.prepare(`
    SELECT COUNT(*) as total_calls, COALESCE(SUM(cost), 0) as total_cost,
           COALESCE(SUM(tokens_in), 0) as total_tokens_in, COALESCE(SUM(tokens_out), 0) as total_tokens_out
    FROM academy_ai_log
  `).get() as any;

  const byFeature = db.prepare(`
    SELECT feature, COUNT(*) as calls, COALESCE(SUM(cost), 0) as cost
    FROM academy_ai_log GROUP BY feature ORDER BY cost DESC
  `).all() as any[];

  const byModel = db.prepare(`
    SELECT model_used as model, COUNT(*) as calls, COALESCE(SUM(cost), 0) as cost
    FROM academy_ai_log GROUP BY model_used ORDER BY cost DESC
  `).all() as any[];

  const summary: AICostSummary = {
    totalCost: totals.total_cost,
    totalCalls: totals.total_calls,
    totalTokensIn: totals.total_tokens_in,
    totalTokensOut: totals.total_tokens_out,
    byFeature: byFeature.map((r: any) => ({ feature: r.feature, calls: r.calls, cost: r.cost })),
    byModel: byModel.map((r: any) => ({ model: r.model, calls: r.calls, cost: r.cost })),
  };

  return summary;
});

// ─── IPC Handlers: Skills ───────────────────────────────────────────────────

ipcMain.handle(IPC_CHANNELS.GET_SKILLS, (_event, studentId: string, subjectId?: string) => {
  const db = getDatabase();
  if (subjectId) {
    const rows = db.prepare('SELECT * FROM academy_skills WHERE student_id = ? AND subject_id = ? ORDER BY name').all(studentId, subjectId);
    return rows.map(mapSkill);
  }
  const rows = db.prepare('SELECT * FROM academy_skills WHERE student_id = ? ORDER BY name').all(studentId);
  return rows.map(mapSkill);
});

ipcMain.handle(IPC_CHANNELS.CREATE_SKILL, (_event, input: CreateSkillInput) => {
  const db = getDatabase();
  const id = uuidv4();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO academy_skills (id, student_id, subject_id, name, proficiency, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, input.studentId, input.subjectId, input.name, input.proficiency || 1, now, now);

  const row = db.prepare('SELECT * FROM academy_skills WHERE id = ?').get(id);
  return mapSkill(row);
});

ipcMain.handle(IPC_CHANNELS.UPDATE_SKILL, (_event, id: string, updates: Partial<Skill>) => {
  const db = getDatabase();
  const now = new Date().toISOString();

  const fields: string[] = [];
  const values: any[] = [];

  if (updates.name !== undefined) { fields.push('name = ?'); values.push(updates.name); }
  if (updates.proficiency !== undefined) { fields.push('proficiency = ?'); values.push(updates.proficiency); }
  if (updates.notes !== undefined) { fields.push('notes = ?'); values.push(updates.notes); }
  if (updates.timesPracticed !== undefined) { fields.push('times_practiced = ?'); values.push(updates.timesPracticed); }
  if (updates.lastPracticed !== undefined) { fields.push('last_practiced = ?'); values.push(updates.lastPracticed); }

  fields.push('updated_at = ?');
  values.push(now);
  values.push(id);

  db.prepare(`UPDATE academy_skills SET ${fields.join(', ')} WHERE id = ?`).run(...values);

  const row = db.prepare('SELECT * FROM academy_skills WHERE id = ?').get(id);
  return mapSkill(row);
});

ipcMain.handle(IPC_CHANNELS.DELETE_SKILL, (_event, id: string) => {
  const db = getDatabase();
  db.prepare('DELETE FROM academy_skills WHERE id = ?').run(id);
});

// ─── IPC Handlers: Assessments ─────────────────────────────────────────────

ipcMain.handle(IPC_CHANNELS.GET_ASSESSMENTS, (_event, studentId: string, subjectId?: string) => {
  const db = getDatabase();
  if (subjectId) {
    const rows = db.prepare('SELECT * FROM academy_assessments WHERE student_id = ? AND subject_id = ? ORDER BY created_at DESC').all(studentId, subjectId);
    return rows.map(mapAssessment);
  }
  const rows = db.prepare('SELECT * FROM academy_assessments WHERE student_id = ? ORDER BY created_at DESC').all(studentId);
  return rows.map(mapAssessment);
});

ipcMain.handle(IPC_CHANNELS.CREATE_ASSESSMENT, (_event, input: CreateAssessmentInput) => {
  const db = getDatabase();
  const id = uuidv4();
  const now = new Date().toISOString();

  const questions = input.questions || [];
  const totalPoints = questions.reduce((sum, q) => sum + (q.points || 1), 0);

  db.prepare(`
    INSERT INTO academy_assessments (id, student_id, subject_id, school_year_id, title, assessment_type, questions, total_points, lesson_ids, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, input.studentId, input.subjectId, input.schoolYearId, input.title, input.assessmentType || 'quiz', JSON.stringify(questions), totalPoints, JSON.stringify(input.lessonIds || []), now, now);

  const row = db.prepare('SELECT * FROM academy_assessments WHERE id = ?').get(id);
  return mapAssessment(row);
});

ipcMain.handle(IPC_CHANNELS.UPDATE_ASSESSMENT, (_event, id: string, updates: Partial<Assessment>) => {
  const db = getDatabase();
  const now = new Date().toISOString();

  const fields: string[] = [];
  const values: any[] = [];

  if (updates.title !== undefined) { fields.push('title = ?'); values.push(updates.title); }
  if (updates.assessmentType !== undefined) { fields.push('assessment_type = ?'); values.push(updates.assessmentType); }
  if (updates.questions !== undefined) { fields.push('questions = ?'); values.push(JSON.stringify(updates.questions)); }
  if (updates.answers !== undefined) { fields.push('answers = ?'); values.push(JSON.stringify(updates.answers)); }
  if (updates.totalPoints !== undefined) { fields.push('total_points = ?'); values.push(updates.totalPoints); }
  if (updates.earnedPoints !== undefined) { fields.push('earned_points = ?'); values.push(updates.earnedPoints); }
  if (updates.scorePercent !== undefined) { fields.push('score_percent = ?'); values.push(updates.scorePercent); }
  if (updates.status !== undefined) { fields.push('status = ?'); values.push(updates.status); }
  if (updates.notes !== undefined) { fields.push('notes = ?'); values.push(updates.notes); }
  if (updates.skillIds !== undefined) { fields.push('skill_ids = ?'); values.push(JSON.stringify(updates.skillIds)); }

  fields.push('updated_at = ?');
  values.push(now);
  values.push(id);

  db.prepare(`UPDATE academy_assessments SET ${fields.join(', ')} WHERE id = ?`).run(...values);

  const row = db.prepare('SELECT * FROM academy_assessments WHERE id = ?').get(id);
  return mapAssessment(row);
});

ipcMain.handle(IPC_CHANNELS.DELETE_ASSESSMENT, (_event, id: string) => {
  const db = getDatabase();
  db.prepare('DELETE FROM academy_assessments WHERE id = ?').run(id);
});

ipcMain.handle(IPC_CHANNELS.GENERATE_ASSESSMENT, async (_event, input: GenerateAssessmentInput) => {
  const db = getDatabase();
  const apiKeys = loadApiKeys();
  const settings = loadSettings();
  const modelId = input.model || settings.defaultModel;

  // Load student
  const studentRow = db.prepare('SELECT * FROM academy_students WHERE id = ?').get(input.studentId) as any;
  if (!studentRow) throw new Error('Student not found');
  const student = mapStudent(studentRow);

  // Load subject
  const subjectRow = db.prepare('SELECT * FROM academy_subjects WHERE id = ?').get(input.subjectId) as any;
  if (!subjectRow) throw new Error('Subject not found');
  const subject = mapSubject(subjectRow);

  // Load current school year
  const yearRow = db.prepare('SELECT * FROM academy_school_years WHERE student_id = ? AND is_current = 1').get(input.studentId) as any;
  if (!yearRow) throw new Error('No current school year found');

  // Load lessons for context
  let lessonRows: any[];
  if (input.lessonIds && input.lessonIds.length > 0) {
    const placeholders = input.lessonIds.map(() => '?').join(',');
    lessonRows = db.prepare(`SELECT * FROM academy_lessons WHERE id IN (${placeholders})`).all(...input.lessonIds);
  } else {
    lessonRows = db.prepare(`SELECT * FROM academy_lessons WHERE subject_id = ? AND status = 'completed' ORDER BY updated_at DESC LIMIT 10`).all(input.subjectId);
  }
  const lessons = lessonRows.map(mapLesson);

  const questionCount = input.questionCount || 10;
  const assessmentType = input.assessmentType || 'quiz';

  // Generate via AI
  const { questions, response } = await generateAssessmentQuestions(
    student,
    subject.name,
    lessons.map(l => ({ title: l.title, objectives: l.objectives, lessonContent: l.lessonContent })),
    questionCount,
    assessmentType,
    modelId,
    apiKeys,
  );

  const totalPoints = questions.reduce((sum, q) => sum + (q.points || 1), 0);

  // Find or create skill IDs for each question's skillName
  const skillIds: string[] = [];
  const now = new Date().toISOString();
  for (const q of questions) {
    if (!q.skillName) continue;
    let skillRow = db.prepare('SELECT id FROM academy_skills WHERE student_id = ? AND subject_id = ? AND name = ?').get(input.studentId, input.subjectId, q.skillName) as any;
    if (!skillRow) {
      const skillId = uuidv4();
      db.prepare('INSERT INTO academy_skills (id, student_id, subject_id, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)').run(skillId, input.studentId, input.subjectId, q.skillName, now, now);
      skillRow = { id: skillId };
    }
    if (!skillIds.includes(skillRow.id)) {
      skillIds.push(skillRow.id);
    }
  }

  // Create assessment
  const id = uuidv4();
  db.prepare(`
    INSERT INTO academy_assessments (id, student_id, subject_id, school_year_id, title, assessment_type, questions, total_points, ai_generated, model_used, generation_cost, lesson_ids, skill_ids, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?)
  `).run(
    id, input.studentId, input.subjectId, yearRow.id,
    `${subject.name} ${assessmentType.charAt(0).toUpperCase() + assessmentType.slice(1)}`,
    assessmentType, JSON.stringify(questions), totalPoints,
    modelId, response.cost,
    JSON.stringify(input.lessonIds || []), JSON.stringify(skillIds),
    now, now,
  );

  // Log AI usage
  const logId = uuidv4();
  db.prepare(`
    INSERT INTO academy_ai_log (id, student_id, feature, model_used, tokens_in, tokens_out, cost, response_time_ms, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(logId, input.studentId, 'assessment', modelId, response.tokensIn, response.tokensOut, response.cost, response.responseTimeMs, now);

  const row = db.prepare('SELECT * FROM academy_assessments WHERE id = ?').get(id);
  return mapAssessment(row);
});

ipcMain.handle(IPC_CHANNELS.GRADE_ASSESSMENT, (_event, id: string, answers: AssessmentAnswer[]) => {
  const db = getDatabase();
  const now = new Date().toISOString();

  // Load assessment
  const assessmentRow = db.prepare('SELECT * FROM academy_assessments WHERE id = ?').get(id) as any;
  if (!assessmentRow) throw new Error('Assessment not found');
  const assessment = mapAssessment(assessmentRow);

  // Grade each answer
  const gradedAnswers: AssessmentAnswer[] = answers.map(a => {
    const question = assessment.questions[a.questionIndex];
    if (!question) return { ...a, correct: false, points: 0 };

    const isCorrect = a.answer.trim().toLowerCase() === question.correctAnswer.trim().toLowerCase();
    return {
      ...a,
      correct: isCorrect,
      points: isCorrect ? question.points : 0,
    };
  });

  const earnedPoints = gradedAnswers.reduce((sum, a) => sum + (a.points || 0), 0);
  const scorePercent = assessment.totalPoints > 0 ? (earnedPoints / assessment.totalPoints) * 100 : 0;

  // Update assessment
  db.prepare(`
    UPDATE academy_assessments SET answers = ?, earned_points = ?, score_percent = ?, status = 'graded', graded_at = ?, updated_at = ?
    WHERE id = ?
  `).run(JSON.stringify(gradedAnswers), earnedPoints, scorePercent, now, now, id);

  // Update linked skill proficiency based on score
  const skillIds: string[] = JSON.parse(assessmentRow.skill_ids || '[]');
  for (const skillId of skillIds) {
    const skillRow = db.prepare('SELECT * FROM academy_skills WHERE id = ?').get(skillId) as any;
    if (!skillRow) continue;

    let newProficiency = skillRow.proficiency;
    if (scorePercent >= 90 && newProficiency < 5) {
      newProficiency = Math.min(5, newProficiency + 1);
    } else if (scorePercent < 50 && newProficiency > 1) {
      newProficiency = Math.max(1, newProficiency - 1);
    }

    db.prepare(`
      UPDATE academy_skills SET proficiency = ?, times_practiced = times_practiced + 1, last_practiced = ?, updated_at = ?
      WHERE id = ?
    `).run(newProficiency, now, now, skillId);
  }

  // Auto-award XP for assessment grading
  const assessmentStudent = assessmentRow.student_id;
  const gamSettings2 = getOrCreateGamificationSettings(db, assessmentStudent);
  if (gamSettings2.enabled) {
    if (scorePercent === 100 && gamSettings2.xpAssessmentPerfect > 0) {
      awardXpInternal(db, assessmentStudent, gamSettings2.xpAssessmentPerfect, `Perfect score: ${assessment.title}`, 'assessment');
    } else if (scorePercent >= 80 && gamSettings2.xpAssessmentPass > 0) {
      awardXpInternal(db, assessmentStudent, gamSettings2.xpAssessmentPass, `Passed: ${assessment.title}`, 'assessment');
    }
    checkAndAwardBadges(db, assessmentStudent);
  }

  const updatedRow = db.prepare('SELECT * FROM academy_assessments WHERE id = ?').get(id);
  return mapAssessment(updatedRow);
});

// ─── IPC Handlers: Reading Log ─────────────────────────────────────────────

ipcMain.handle(IPC_CHANNELS.GET_READING_LOG, (_event, studentId: string) => {
  const db = getDatabase();
  const rows = db.prepare('SELECT * FROM academy_reading_log WHERE student_id = ? ORDER BY created_at DESC').all(studentId);
  return rows.map(mapReadingEntry);
});

ipcMain.handle(IPC_CHANNELS.CREATE_READING_ENTRY, (_event, input: CreateReadingEntryInput) => {
  const db = getDatabase();
  const id = uuidv4();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO academy_reading_log (id, student_id, school_year_id, title, author, genre, total_pages, start_date, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, input.studentId, input.schoolYearId, input.title, input.author || '', input.genre || '', input.totalPages || null, input.startDate || now.split('T')[0], now, now);

  const row = db.prepare('SELECT * FROM academy_reading_log WHERE id = ?').get(id);
  return mapReadingEntry(row);
});

ipcMain.handle(IPC_CHANNELS.UPDATE_READING_ENTRY, (_event, id: string, updates: Partial<ReadingEntry>) => {
  const db = getDatabase();
  const now = new Date().toISOString();

  const fields: string[] = [];
  const values: any[] = [];

  if (updates.title !== undefined) { fields.push('title = ?'); values.push(updates.title); }
  if (updates.author !== undefined) { fields.push('author = ?'); values.push(updates.author); }
  if (updates.genre !== undefined) { fields.push('genre = ?'); values.push(updates.genre); }
  if (updates.totalPages !== undefined) { fields.push('total_pages = ?'); values.push(updates.totalPages); }
  if (updates.pagesRead !== undefined) { fields.push('pages_read = ?'); values.push(updates.pagesRead); }
  if (updates.status !== undefined) { fields.push('status = ?'); values.push(updates.status); }
  if (updates.startDate !== undefined) { fields.push('start_date = ?'); values.push(updates.startDate); }
  if (updates.finishDate !== undefined) { fields.push('finish_date = ?'); values.push(updates.finishDate); }
  if (updates.totalMinutes !== undefined) { fields.push('total_minutes = ?'); values.push(updates.totalMinutes); }
  if (updates.rating !== undefined) { fields.push('rating = ?'); values.push(updates.rating); }
  if (updates.review !== undefined) { fields.push('review = ?'); values.push(updates.review); }
  if (updates.notes !== undefined) { fields.push('notes = ?'); values.push(updates.notes); }

  fields.push('updated_at = ?');
  values.push(now);
  values.push(id);

  db.prepare(`UPDATE academy_reading_log SET ${fields.join(', ')} WHERE id = ?`).run(...values);

  const row = db.prepare('SELECT * FROM academy_reading_log WHERE id = ?').get(id) as any;
  const entry = mapReadingEntry(row);

  // Auto-award XP when a book is finished
  if (updates.status === 'completed' && row) {
    try {
      const settings = getOrCreateGamificationSettings(db, row.student_id);
      if (settings.enabled) {
        awardXpInternal(db, row.student_id, settings.xpReadingSession, `Finished reading "${entry.title}"`, 'reading');
        checkAndAwardBadges(db, row.student_id);
      }
    } catch (_) { /* gamification errors should not break reading updates */ }
  }

  return entry;
});

ipcMain.handle(IPC_CHANNELS.DELETE_READING_ENTRY, (_event, id: string) => {
  const db = getDatabase();
  db.prepare('DELETE FROM academy_reading_log WHERE id = ?').run(id);
});

// ─── IPC Handlers: Progress Data ───────────────────────────────────────────

ipcMain.handle(IPC_CHANNELS.GET_PROGRESS_DATA, (_event, studentId: string) => {
  const db = getDatabase();

  // Skills by subject
  const subjectRows = db.prepare('SELECT * FROM academy_subjects WHERE student_id = ? AND is_active = 1 ORDER BY sort_order, name').all(studentId) as any[];
  const skillsBySubject = subjectRows.map((s: any) => {
    const skills = db.prepare('SELECT * FROM academy_skills WHERE student_id = ? AND subject_id = ? ORDER BY name').all(studentId, s.id).map(mapSkill);
    return { subjectId: s.id, subjectName: s.name, subjectColor: s.color || '#4c6ef5', skills };
  });

  // Assessment scores by subject
  const assessmentScores = subjectRows.map((s: any) => {
    const rows = db.prepare(`
      SELECT score_percent, graded_at FROM academy_assessments
      WHERE student_id = ? AND subject_id = ? AND status = 'graded' AND score_percent IS NOT NULL
      ORDER BY graded_at
    `).all(studentId, s.id) as any[];
    return {
      subjectName: s.name,
      subjectColor: s.color || '#4c6ef5',
      scores: rows.map((r: any) => ({ date: r.graded_at, percent: r.score_percent })),
    };
  });

  // Reading stats
  const readingRows = db.prepare('SELECT * FROM academy_reading_log WHERE student_id = ?').all(studentId) as any[];
  const readingStats = {
    totalBooks: readingRows.length,
    completed: readingRows.filter((r: any) => r.status === 'completed').length,
    totalPages: readingRows.reduce((sum: number, r: any) => sum + (r.pages_read || 0), 0),
    totalMinutes: readingRows.reduce((sum: number, r: any) => sum + (r.total_minutes || 0), 0),
  };

  // Weekly hours (last 8 weeks)
  const weeklyHours: { week: string; hours: number }[] = [];
  const now = new Date();
  for (let i = 7; i >= 0; i--) {
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay() - i * 7 + 1); // Monday
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6); // Sunday

    const startStr = weekStart.toISOString().split('T')[0];
    const endStr = weekEnd.toISOString().split('T')[0];

    const result = db.prepare(`
      SELECT COALESCE(SUM(COALESCE(actual_minutes, estimated_minutes)), 0) as total_minutes
      FROM academy_lessons
      WHERE student_id = ? AND status = 'completed' AND scheduled_date >= ? AND scheduled_date <= ?
    `).get(studentId, startStr, endStr) as any;

    weeklyHours.push({ week: startStr, hours: (result?.total_minutes || 0) / 60 });
  }

  const progressData: ProgressData = { skillsBySubject, assessmentScores, readingStats, weeklyHours };
  return progressData;
});

// ─── IPC Handlers: Tutor Sessions ──────────────────────────────────────────

ipcMain.handle(IPC_CHANNELS.CREATE_TUTOR_SESSION, (_event, input: CreateTutorSessionInput) => {
  const db = getDatabase();
  const id = uuidv4();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO academy_tutor_sessions (id, student_id, subject_id, school_year_id, topic, mode, model_used, started_at, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, input.studentId, input.subjectId || null, input.schoolYearId, input.topic, input.mode || 'guided', input.model || null, now, now);

  // Insert system greeting message
  const msgId = uuidv4();
  db.prepare(`
    INSERT INTO academy_tutor_messages (id, session_id, role, content, created_at)
    VALUES (?, ?, 'system', ?, ?)
  `).run(msgId, id, `Tutor session started: ${input.topic}`, now);

  db.prepare('UPDATE academy_tutor_sessions SET total_messages = 1 WHERE id = ?').run(id);

  const row = db.prepare('SELECT * FROM academy_tutor_sessions WHERE id = ?').get(id);
  return mapTutorSession(row);
});

ipcMain.handle(IPC_CHANNELS.GET_TUTOR_SESSIONS, (_event, studentId: string) => {
  const db = getDatabase();
  const rows = db.prepare('SELECT * FROM academy_tutor_sessions WHERE student_id = ? ORDER BY created_at DESC').all(studentId);
  return rows.map(mapTutorSession);
});

ipcMain.handle(IPC_CHANNELS.GET_TUTOR_SESSION, (_event, id: string) => {
  const db = getDatabase();
  const row = db.prepare('SELECT * FROM academy_tutor_sessions WHERE id = ?').get(id);
  if (!row) throw new Error('Session not found');
  return mapTutorSession(row);
});

ipcMain.handle(IPC_CHANNELS.GET_TUTOR_MESSAGES, (_event, sessionId: string) => {
  const db = getDatabase();
  const rows = db.prepare('SELECT * FROM academy_tutor_messages WHERE session_id = ? ORDER BY created_at').all(sessionId);
  return rows.map(mapTutorMessage);
});

ipcMain.handle(IPC_CHANNELS.SEND_TUTOR_MESSAGE, async (_event, input: SendTutorMessageInput) => {
  const db = getDatabase();
  const apiKeys = loadApiKeys();
  const settings = loadSettings();

  // Load session
  const sessionRow = db.prepare('SELECT * FROM academy_tutor_sessions WHERE id = ?').get(input.sessionId) as any;
  if (!sessionRow) throw new Error('Session not found');
  const session = mapTutorSession(sessionRow);
  if (session.status !== 'active') throw new Error('Session is not active');

  const modelId = input.model || session.modelUsed || settings.defaultModel;

  // Safety check on student message
  const safety = checkSafetyFilter(input.content);
  const now = new Date().toISOString();

  if (!safety.safe) {
    // Save filtered message
    const filteredMsgId = uuidv4();
    db.prepare(`
      INSERT INTO academy_tutor_messages (id, session_id, role, content, filtered, filter_reason, created_at)
      VALUES (?, ?, 'student', ?, 1, ?, ?)
    `).run(filteredMsgId, input.sessionId, input.content, safety.reason || '', now);

    db.prepare('UPDATE academy_tutor_sessions SET student_messages = student_messages + 1, safety_alerts = safety_alerts + 1, total_messages = total_messages + 1 WHERE id = ?').run(input.sessionId);

    // Send filtered chunk to renderer
    const win = BrowserWindow.getAllWindows()[0];
    if (win) {
      const chunk: TutorStreamChunk = { type: 'filtered', filterReason: safety.reason };
      win.webContents.send(IPC_CHANNELS.TUTOR_STREAM_CHUNK, chunk);
    }
    return;
  }

  // Save student message
  const studentMsgId = uuidv4();
  db.prepare(`
    INSERT INTO academy_tutor_messages (id, session_id, role, content, created_at)
    VALUES (?, ?, 'student', ?, ?)
  `).run(studentMsgId, input.sessionId, input.content, now);

  db.prepare('UPDATE academy_tutor_sessions SET student_messages = student_messages + 1, total_messages = total_messages + 1 WHERE id = ?').run(input.sessionId);

  // Load student
  const studentRow = db.prepare('SELECT * FROM academy_students WHERE id = ?').get(session.studentId) as any;
  if (!studentRow) throw new Error('Student not found');
  const student = mapStudent(studentRow);

  // Load subject name if applicable
  let subjectName: string | undefined;
  if (session.subjectId) {
    const subjectRow = db.prepare('SELECT name FROM academy_subjects WHERE id = ?').get(session.subjectId) as any;
    subjectName = subjectRow?.name;
  }

  // Load message history
  const messageRows = db.prepare('SELECT * FROM academy_tutor_messages WHERE session_id = ? ORDER BY created_at').all(input.sessionId);
  const messages = messageRows.map(mapTutorMessage);

  const win = BrowserWindow.getAllWindows()[0];

  await streamTutorResponse(
    student,
    session.topic,
    session.mode as 'guided' | 'free' | 'review',
    subjectName,
    messages,
    modelId,
    apiKeys,
    {
      onChunk: (text) => {
        if (win) {
          const chunk: TutorStreamChunk = { type: 'chunk', content: text };
          win.webContents.send(IPC_CHANNELS.TUTOR_STREAM_CHUNK, chunk);
        }
      },
      onDone: (fullContent, tokensIn, tokensOut, cost) => {
        const tutorMsgId = uuidv4();
        const doneTime = new Date().toISOString();
        db.prepare(`
          INSERT INTO academy_tutor_messages (id, session_id, role, content, tokens_in, tokens_out, cost, created_at)
          VALUES (?, ?, 'tutor', ?, ?, ?, ?, ?)
        `).run(tutorMsgId, input.sessionId, fullContent, tokensIn, tokensOut, cost, doneTime);

        db.prepare('UPDATE academy_tutor_sessions SET total_messages = total_messages + 1, total_cost = total_cost + ?, model_used = ? WHERE id = ?').run(cost, modelId, input.sessionId);

        // Log AI usage
        const logId = uuidv4();
        db.prepare(`
          INSERT INTO academy_ai_log (id, student_id, feature, model_used, tokens_in, tokens_out, cost, response_time_ms, created_at)
          VALUES (?, ?, 'tutor', ?, ?, ?, ?, 0, ?)
        `).run(logId, session.studentId, modelId, tokensIn, tokensOut, cost, doneTime);

        const tutorMsg = mapTutorMessage(db.prepare('SELECT * FROM academy_tutor_messages WHERE id = ?').get(tutorMsgId));
        const updatedSession = mapTutorSession(db.prepare('SELECT * FROM academy_tutor_sessions WHERE id = ?').get(input.sessionId));

        if (win) {
          const chunk: TutorStreamChunk = { type: 'done', message: tutorMsg, session: updatedSession };
          win.webContents.send(IPC_CHANNELS.TUTOR_STREAM_CHUNK, chunk);
        }
      },
      onError: (error) => {
        if (win) {
          const chunk: TutorStreamChunk = { type: 'error', error };
          win.webContents.send(IPC_CHANNELS.TUTOR_STREAM_CHUNK, chunk);
        }
      },
    },
  );
});

ipcMain.handle(IPC_CHANNELS.END_TUTOR_SESSION, (_event, id: string) => {
  const db = getDatabase();
  const now = new Date().toISOString();

  // Calculate duration
  const session = db.prepare('SELECT * FROM academy_tutor_sessions WHERE id = ?').get(id) as any;
  if (!session) throw new Error('Session not found');

  const startedAt = new Date(session.started_at).getTime();
  const durationSeconds = Math.round((Date.now() - startedAt) / 1000);

  db.prepare(`
    UPDATE academy_tutor_sessions SET status = 'completed', ended_at = ?, duration_seconds = ? WHERE id = ?
  `).run(now, durationSeconds, id);

  const row = db.prepare('SELECT * FROM academy_tutor_sessions WHERE id = ?').get(id);
  return mapTutorSession(row);
});

ipcMain.handle(IPC_CHANNELS.DELETE_TUTOR_SESSION, (_event, id: string) => {
  const db = getDatabase();
  db.prepare('DELETE FROM academy_tutor_sessions WHERE id = ?').run(id);
});

// ─── IPC Handlers: Resources ───────────────────────────────────────────────

ipcMain.handle(IPC_CHANNELS.GET_RESOURCES, (_event, studentId: string) => {
  const db = getDatabase();
  const rows = db.prepare('SELECT * FROM academy_resources WHERE student_id = ? ORDER BY created_at DESC').all(studentId);
  return rows.map(mapResource);
});

ipcMain.handle(IPC_CHANNELS.CREATE_RESOURCE, (_event, input: CreateResourceInput) => {
  const db = getDatabase();
  const id = uuidv4();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO academy_resources (id, student_id, subject_id, school_year_id, title, resource_type, topic, difficulty, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, input.studentId, input.subjectId || null, input.schoolYearId, input.title, input.resourceType, input.topic, input.difficulty || 'medium', now, now);

  const row = db.prepare('SELECT * FROM academy_resources WHERE id = ?').get(id);
  return mapResource(row);
});

ipcMain.handle(IPC_CHANNELS.GENERATE_RESOURCE, async (_event, input: GenerateResourceInput) => {
  const db = getDatabase();
  const apiKeys = loadApiKeys();
  const settings = loadSettings();
  const modelId = input.model || settings.defaultModel;

  // Load student
  const studentRow = db.prepare('SELECT * FROM academy_students WHERE id = ?').get(input.studentId) as any;
  if (!studentRow) throw new Error('Student not found');
  const student = mapStudent(studentRow);

  // Load school year
  const yearRow = db.prepare('SELECT * FROM academy_school_years WHERE student_id = ? AND is_current = 1').get(input.studentId) as any;
  if (!yearRow) throw new Error('No current school year found');

  // Load subject name if applicable
  let subjectName: string | undefined;
  if (input.subjectId) {
    const subjectRow = db.prepare('SELECT name FROM academy_subjects WHERE id = ?').get(input.subjectId) as any;
    subjectName = subjectRow?.name;
  }

  const difficulty = input.difficulty || 'medium';
  const { resource, response } = await generateResourceContent(
    student,
    input.resourceType,
    input.topic,
    difficulty,
    subjectName,
    modelId,
    apiKeys,
  );

  // Save resource
  const id = uuidv4();
  const now = new Date().toISOString();
  const title = `${input.topic} ${input.resourceType.charAt(0).toUpperCase() + input.resourceType.slice(1)}`;

  db.prepare(`
    INSERT INTO academy_resources (id, student_id, subject_id, school_year_id, title, resource_type, topic, difficulty, content, answer_key, ai_generated, model_used, generation_cost, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?)
  `).run(
    id, input.studentId, input.subjectId || null, yearRow.id,
    title, input.resourceType, input.topic, difficulty,
    resource.content, resource.answerKey,
    modelId, response.cost,
    now, now,
  );

  // Log AI usage
  const logId = uuidv4();
  db.prepare(`
    INSERT INTO academy_ai_log (id, student_id, feature, model_used, tokens_in, tokens_out, cost, response_time_ms, created_at)
    VALUES (?, ?, 'resource', ?, ?, ?, ?, ?, ?)
  `).run(logId, input.studentId, modelId, response.tokensIn, response.tokensOut, response.cost, response.responseTimeMs, now);

  const row = db.prepare('SELECT * FROM academy_resources WHERE id = ?').get(id);
  return mapResource(row);
});

ipcMain.handle(IPC_CHANNELS.DELETE_RESOURCE, (_event, id: string) => {
  const db = getDatabase();
  db.prepare('DELETE FROM academy_resources WHERE id = ?').run(id);
});

// ─── IPC Handlers: PDF Export ──────────────────────────────────────────────

ipcMain.handle(IPC_CHANNELS.EXPORT_PDF, async (_event, html: string, title: string) => {
  const win = BrowserWindow.getAllWindows()[0];
  if (!win) return null;

  // Create a hidden window for PDF generation
  const pdfWin = new BrowserWindow({
    width: 800,
    height: 1100,
    show: false,
    webPreferences: { nodeIntegration: false, contextIsolation: true },
  });

  const wrappedHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title>
    <style>body { font-family: Arial, sans-serif; padding: 40px; font-size: 14px; line-height: 1.6; color: #333; }
    h1 { font-size: 24px; margin-bottom: 20px; } h2 { font-size: 18px; margin-top: 20px; }
    pre { white-space: pre-wrap; font-family: monospace; } .answer-key { page-break-before: always; }</style>
  </head><body>${html}</body></html>`;

  await pdfWin.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(wrappedHtml)}`);

  const result = await dialog.showSaveDialog(win, {
    title: 'Save PDF',
    defaultPath: `${title.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`,
    filters: [{ name: 'PDF', extensions: ['pdf'] }],
  });

  if (result.canceled || !result.filePath) {
    pdfWin.close();
    return null;
  }

  const pdfData = await pdfWin.webContents.printToPDF({
    marginType: 0,
    printBackground: true,
    pageSize: 'Letter',
  });

  fs.writeFileSync(result.filePath, pdfData);
  pdfWin.close();
  return result.filePath;
});

ipcMain.handle(IPC_CHANNELS.PRINT_RESOURCE, async (_event, html: string) => {
  const win = BrowserWindow.getAllWindows()[0];
  if (!win) return;

  const printWin = new BrowserWindow({
    width: 800,
    height: 1100,
    show: false,
    webPreferences: { nodeIntegration: false, contextIsolation: true },
  });

  const wrappedHtml = `<!DOCTYPE html><html><head><meta charset="utf-8">
    <style>body { font-family: Arial, sans-serif; padding: 40px; font-size: 14px; line-height: 1.6; color: #333; }
    h1 { font-size: 24px; margin-bottom: 20px; } h2 { font-size: 18px; margin-top: 20px; }
    pre { white-space: pre-wrap; font-family: monospace; }</style>
  </head><body>${html}</body></html>`;

  await printWin.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(wrappedHtml)}`);
  printWin.webContents.print({}, () => {
    printWin.close();
  });
});

// ─── IPC Handlers: Gamification ─────────────────────────────────────────────

ipcMain.handle(IPC_CHANNELS.GET_GAMIFICATION_SETTINGS, (_event, studentId: string) => {
  const db = getDatabase();
  return getOrCreateGamificationSettings(db, studentId);
});

ipcMain.handle(IPC_CHANNELS.SAVE_GAMIFICATION_SETTINGS, (_event, studentId: string, updates: Partial<GamificationSettings>) => {
  const db = getDatabase();
  getOrCreateGamificationSettings(db, studentId); // ensure exists
  const now = new Date().toISOString();

  const fields: string[] = [];
  const values: any[] = [];

  if (updates.enabled !== undefined) { fields.push('enabled = ?'); values.push(updates.enabled ? 1 : 0); }
  if (updates.theme !== undefined) { fields.push('theme = ?'); values.push(updates.theme); }
  if (updates.xpCompleteLesson !== undefined) { fields.push('xp_complete_lesson = ?'); values.push(updates.xpCompleteLesson); }
  if (updates.xpAssessmentPass !== undefined) { fields.push('xp_assessment_pass = ?'); values.push(updates.xpAssessmentPass); }
  if (updates.xpAssessmentPerfect !== undefined) { fields.push('xp_assessment_perfect = ?'); values.push(updates.xpAssessmentPerfect); }
  if (updates.xpCompleteDaily !== undefined) { fields.push('xp_complete_daily = ?'); values.push(updates.xpCompleteDaily); }
  if (updates.xpReadingSession !== undefined) { fields.push('xp_reading_session = ?'); values.push(updates.xpReadingSession); }
  if (updates.xpStreakDay !== undefined) { fields.push('xp_streak_day = ?'); values.push(updates.xpStreakDay); }
  if (updates.xpBonusChallenge !== undefined) { fields.push('xp_bonus_challenge = ?'); values.push(updates.xpBonusChallenge); }
  if (updates.xpHelpSibling !== undefined) { fields.push('xp_help_sibling = ?'); values.push(updates.xpHelpSibling); }
  if (updates.showXpNumbers !== undefined) { fields.push('show_xp_numbers = ?'); values.push(updates.showXpNumbers ? 1 : 0); }
  if (updates.showSkillTree !== undefined) { fields.push('show_skill_tree = ?'); values.push(updates.showSkillTree ? 1 : 0); }
  if (updates.showStreak !== undefined) { fields.push('show_streak = ?'); values.push(updates.showStreak ? 1 : 0); }
  if (updates.showBadges !== undefined) { fields.push('show_badges = ?'); values.push(updates.showBadges ? 1 : 0); }
  if (updates.badgesMath !== undefined) { fields.push('badges_math = ?'); values.push(updates.badgesMath ? 1 : 0); }
  if (updates.badgesReading !== undefined) { fields.push('badges_reading = ?'); values.push(updates.badgesReading ? 1 : 0); }
  if (updates.badgesStreak !== undefined) { fields.push('badges_streak = ?'); values.push(updates.badgesStreak ? 1 : 0); }
  if (updates.badgesSubject !== undefined) { fields.push('badges_subject = ?'); values.push(updates.badgesSubject ? 1 : 0); }
  if (updates.badgesSpecial !== undefined) { fields.push('badges_special = ?'); values.push(updates.badgesSpecial ? 1 : 0); }

  if (fields.length > 0) {
    fields.push('updated_at = ?');
    values.push(now);
    values.push(studentId);
    db.prepare(`UPDATE academy_gamification_settings SET ${fields.join(', ')} WHERE student_id = ?`).run(...values);
  }

  return getOrCreateGamificationSettings(db, studentId);
});

ipcMain.handle(IPC_CHANNELS.GET_GAMIFICATION_STATE, (_event, studentId: string) => {
  const db = getDatabase();
  const settings = getOrCreateGamificationSettings(db, studentId);
  const totalXp = getTotalXp(db, studentId);
  const levelInfo = getLevelInfo(totalXp);
  const streak = getOrCreateStreak(db, studentId);
  const badges = db.prepare('SELECT * FROM academy_badges_earned WHERE student_id = ? ORDER BY earned_at DESC').all(studentId).map(mapBadgeEarned);
  const recentXp = db.prepare('SELECT * FROM academy_xp_log WHERE student_id = ? ORDER BY created_at DESC LIMIT 20').all(studentId).map(mapXPLogEntry);
  const activeGoals = db.prepare(`SELECT * FROM academy_goals WHERE student_id = ? AND status = 'active' ORDER BY end_date`).all(studentId).map(mapGoal);

  const today = new Date().toISOString().split('T')[0];
  const todayXpResult = db.prepare(`SELECT COALESCE(SUM(amount), 0) as total FROM academy_xp_log WHERE student_id = ? AND created_at >= ?`).get(studentId, today) as any;

  const state: GamificationState = {
    settings,
    totalXp,
    level: levelInfo.level,
    levelName: levelInfo.levelName,
    xpToNextLevel: levelInfo.xpToNextLevel,
    streak,
    badges,
    recentXp,
    activeGoals,
    todayXp: todayXpResult.total || 0,
  };

  return state;
});

ipcMain.handle(IPC_CHANNELS.AWARD_XP, (_event, studentId: string, amount: number, reason: string, category?: string) => {
  const db = getDatabase();
  return awardXpInternal(db, studentId, amount, reason, category || 'general');
});

ipcMain.handle(IPC_CHANNELS.GET_XP_LOG, (_event, studentId: string) => {
  const db = getDatabase();
  return db.prepare('SELECT * FROM academy_xp_log WHERE student_id = ? ORDER BY created_at DESC LIMIT 100').all(studentId).map(mapXPLogEntry);
});

ipcMain.handle(IPC_CHANNELS.GET_BADGES, (_event, studentId: string) => {
  const db = getDatabase();
  return db.prepare('SELECT * FROM academy_badges_earned WHERE student_id = ? ORDER BY earned_at DESC').all(studentId).map(mapBadgeEarned);
});

ipcMain.handle(IPC_CHANNELS.CHECK_BADGES, (_event, studentId: string) => {
  const db = getDatabase();
  return checkAndAwardBadges(db, studentId);
});

ipcMain.handle(IPC_CHANNELS.UPDATE_STREAK, (_event, studentId: string) => {
  const db = getDatabase();
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const streak = getOrCreateStreak(db, studentId);

  // Check if there are any completed lessons today
  const completedToday = (db.prepare(`SELECT COUNT(*) as c FROM academy_lessons WHERE student_id = ? AND scheduled_date = ? AND status = 'completed'`).get(studentId, today) as any).c;

  if (completedToday === 0) return streak;

  if (streak.lastSchoolDate === today) return streak; // Already updated today

  // Check if yesterday was the last school date (continuing streak)
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  let newStreak = 1; // At minimum, today is a school day
  if (streak.lastSchoolDate === yesterdayStr) {
    newStreak = streak.currentStreak + 1;
  }

  // Also check if it was a weekend gap (skip Saturday/Sunday)
  if (!streak.lastSchoolDate || streak.lastSchoolDate === yesterdayStr) {
    // Normal continuation
  } else {
    // Check if the gap is only weekend days
    const lastDate = new Date(streak.lastSchoolDate);
    const daysDiff = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
    if (daysDiff <= 3) { // Allow up to 3-day gap for weekends
      const allWeekend = Array.from({ length: daysDiff - 1 }, (_, i) => {
        const d = new Date(lastDate);
        d.setDate(lastDate.getDate() + i + 1);
        return d.getDay();
      }).every(day => day === 0 || day === 6);
      if (allWeekend) {
        newStreak = streak.currentStreak + 1;
      }
    }
  }

  const longestStreak = Math.max(streak.longestStreak, newStreak);

  db.prepare('UPDATE academy_streaks SET current_streak = ?, longest_streak = ?, last_school_date = ?, updated_at = ? WHERE student_id = ?').run(
    newStreak, longestStreak, today, now.toISOString(), studentId,
  );

  // Award streak XP
  const settings = getOrCreateGamificationSettings(db, studentId);
  if (settings.enabled && settings.xpStreakDay > 0) {
    awardXpInternal(db, studentId, settings.xpStreakDay, `Day ${newStreak} streak bonus`, 'streak');
  }

  return { currentStreak: newStreak, longestStreak, lastSchoolDate: today } as StreakInfo;
});

ipcMain.handle(IPC_CHANNELS.GET_GOALS, (_event, studentId: string) => {
  const db = getDatabase();
  return db.prepare('SELECT * FROM academy_goals WHERE student_id = ? ORDER BY created_at DESC').all(studentId).map(mapGoal);
});

ipcMain.handle(IPC_CHANNELS.CREATE_GOAL, (_event, input: CreateGoalInput) => {
  const db = getDatabase();
  const id = uuidv4();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO academy_goals (id, student_id, title, goal_type, target_xp, reward_text, start_date, end_date, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, input.studentId, input.title, input.goalType || 'weekly', input.targetXp, input.rewardText || '', input.startDate, input.endDate, now, now);

  return mapGoal(db.prepare('SELECT * FROM academy_goals WHERE id = ?').get(id));
});

ipcMain.handle(IPC_CHANNELS.UPDATE_GOAL, (_event, id: string, updates: Partial<Goal>) => {
  const db = getDatabase();
  const now = new Date().toISOString();

  const fields: string[] = [];
  const values: any[] = [];

  if (updates.title !== undefined) { fields.push('title = ?'); values.push(updates.title); }
  if (updates.targetXp !== undefined) { fields.push('target_xp = ?'); values.push(updates.targetXp); }
  if (updates.rewardText !== undefined) { fields.push('reward_text = ?'); values.push(updates.rewardText); }
  if (updates.status !== undefined) { fields.push('status = ?'); values.push(updates.status); }

  fields.push('updated_at = ?');
  values.push(now);
  values.push(id);

  db.prepare(`UPDATE academy_goals SET ${fields.join(', ')} WHERE id = ?`).run(...values);

  return mapGoal(db.prepare('SELECT * FROM academy_goals WHERE id = ?').get(id));
});

ipcMain.handle(IPC_CHANNELS.DELETE_GOAL, (_event, id: string) => {
  const db = getDatabase();
  db.prepare('DELETE FROM academy_goals WHERE id = ?').run(id);
});

// ─── IPC Handlers: Multi-Child Schedule ─────────────────────────────────────

ipcMain.handle(IPC_CHANNELS.GENERATE_MULTI_CHILD_SCHEDULE, async (_event, input: GenerateMultiChildScheduleInput) => {
  const db = getDatabase();
  const apiKeys = loadApiKeys();
  const settings = loadSettings();
  const modelId = input.model || settings.defaultModel;

  // Load all students
  const students: Student[] = input.studentIds.map(id => {
    const row = db.prepare('SELECT * FROM academy_students WHERE id = ?').get(id);
    if (!row) throw new Error(`Student not found: ${id}`);
    return mapStudent(row);
  });

  // Load subjects for each student
  const studentSubjects: Record<string, Subject[]> = {};
  for (const student of students) {
    const subjectRows = db.prepare('SELECT * FROM academy_subjects WHERE student_id = ? AND is_active = 1 ORDER BY sort_order, name').all(student.id);
    studentSubjects[student.id] = subjectRows.map(mapSubject);
  }

  // Load recent lessons for continuity
  const recentLessonsMap: Record<string, { subjectName: string; title: string }[]> = {};
  for (const student of students) {
    const rows = db.prepare(`SELECT l.title, s.name as subject_name FROM academy_lessons l JOIN academy_subjects s ON l.subject_id = s.id WHERE l.student_id = ? AND l.status = 'completed' ORDER BY l.updated_at DESC LIMIT 10`).all(student.id) as any[];
    recentLessonsMap[student.id] = rows.map((r: any) => ({ subjectName: r.subject_name, title: r.title }));
  }

  const { lessons: generatedLessons, response } = await generateMultiChildSchedule(
    students, studentSubjects, recentLessonsMap, input.date, input.scope, modelId, apiKeys,
  );

  const now = new Date().toISOString();
  const createdLessons: Lesson[] = [];

  for (const genLesson of generatedLessons) {
    // Find the student and subject
    const student = students.find(s => s.name.toLowerCase() === genLesson.studentName?.toLowerCase());
    if (!student) continue;

    const subjects = studentSubjects[student.id] || [];
    const subject = subjects.find(s => s.name.toLowerCase() === genLesson.subjectName.toLowerCase());
    if (!subject) continue;

    const yearRow = db.prepare('SELECT id FROM academy_school_years WHERE student_id = ? AND is_current = 1').get(student.id) as any;
    if (!yearRow) continue;

    const lessonId = uuidv4();
    db.prepare(`
      INSERT INTO academy_lessons (id, student_id, subject_id, school_year_id, title, description, scheduled_date, estimated_minutes, lesson_content, materials_needed, objectives, ai_generated, model_used, generation_cost, sort_order, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?)
    `).run(
      lessonId, student.id, subject.id, yearRow.id,
      genLesson.title, genLesson.description, genLesson.scheduledDate,
      genLesson.estimatedMinutes, genLesson.lessonContent,
      JSON.stringify(genLesson.materialsNeeded), JSON.stringify(genLesson.objectives),
      modelId, response.cost / Math.max(generatedLessons.length, 1),
      genLesson.sortOrder || 0, now, now,
    );

    const row = db.prepare('SELECT * FROM academy_lessons WHERE id = ?').get(lessonId);
    createdLessons.push(mapLesson(row));
  }

  // Log AI usage
  const logId = uuidv4();
  db.prepare(`
    INSERT INTO academy_ai_log (id, student_id, feature, model_used, tokens_in, tokens_out, cost, response_time_ms, created_at)
    VALUES (?, ?, 'multi_child_schedule', ?, ?, ?, ?, ?, ?)
  `).run(logId, null, modelId, response.tokensIn, response.tokensOut, response.cost, response.responseTimeMs, now);

  return createdLessons;
});

// ─── IPC Handlers: Compliance ───────────────────────────────────────────────

ipcMain.handle(IPC_CHANNELS.GET_COMPLIANCE_REQUIREMENTS, (_event, state: string) => {
  const db = getDatabase();
  const rows = db.prepare('SELECT * FROM academy_compliance WHERE state = ? ORDER BY requirement_type, description').all(state);
  return rows.map(mapComplianceRequirement);
});

ipcMain.handle(IPC_CHANNELS.SET_COMPLIANCE_REQUIREMENTS, (_event, state: string, requirements: any[]) => {
  const db = getDatabase();
  const now = new Date().toISOString();

  // Clear existing requirements for this state and insert new ones
  db.prepare('DELETE FROM academy_compliance WHERE state = ?').run(state);

  const results: ComplianceRequirement[] = [];
  for (const req of requirements) {
    const id = uuidv4();
    db.prepare(`
      INSERT INTO academy_compliance (id, state, requirement_type, description, is_required, details, source_url, last_verified, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, state, req.requirementType, req.description, req.isRequired ? 1 : 0, JSON.stringify(req.details || {}), req.sourceUrl || '', req.lastVerified || now, now);
    const row = db.prepare('SELECT * FROM academy_compliance WHERE id = ?').get(id);
    results.push(mapComplianceRequirement(row));
  }
  return results;
});

ipcMain.handle(IPC_CHANNELS.GET_COMPLIANCE_STATUS, (_event, studentId: string, schoolYearId: string) => {
  const db = getDatabase();
  // Join with compliance table to include requirement details
  const rows = db.prepare(`
    SELECT cs.*, c.state, c.requirement_type, c.description as req_description, c.is_required, c.details as req_details, c.source_url
    FROM academy_compliance_status cs
    JOIN academy_compliance c ON cs.compliance_id = c.id
    WHERE cs.student_id = ? AND cs.school_year_id = ?
    ORDER BY c.requirement_type, c.description
  `).all(studentId, schoolYearId) as any[];

  return rows.map((row: any) => {
    const status = mapComplianceStatus(row);
    status.requirement = {
      id: row.compliance_id,
      state: row.state,
      requirementType: row.requirement_type,
      description: row.req_description,
      isRequired: !!row.is_required,
      details: JSON.parse(row.req_details || '{}'),
      sourceUrl: row.source_url || '',
      lastVerified: null,
      createdAt: row.created_at,
    };
    return status;
  });
});

ipcMain.handle(IPC_CHANNELS.UPDATE_COMPLIANCE_STATUS, (_event, id: string, updates: Partial<ComplianceStatus>) => {
  const db = getDatabase();
  const now = new Date().toISOString();

  const fields: string[] = [];
  const values: any[] = [];

  if (updates.status !== undefined) { fields.push('status = ?'); values.push(updates.status); }
  if (updates.completionDate !== undefined) { fields.push('completion_date = ?'); values.push(updates.completionDate); }
  if (updates.notes !== undefined) { fields.push('notes = ?'); values.push(updates.notes); }
  if (updates.documentationPath !== undefined) { fields.push('documentation_path = ?'); values.push(updates.documentationPath); }

  fields.push('updated_at = ?');
  values.push(now);
  values.push(id);

  db.prepare(`UPDATE academy_compliance_status SET ${fields.join(', ')} WHERE id = ?`).run(...values);

  const row = db.prepare('SELECT * FROM academy_compliance_status WHERE id = ?').get(id);
  return mapComplianceStatus(row);
});

// ─── IPC Handlers: Portfolio ────────────────────────────────────────────────

ipcMain.handle(IPC_CHANNELS.GET_PORTFOLIO, (_event, studentId: string, schoolYearId?: string) => {
  const db = getDatabase();
  let query = 'SELECT * FROM academy_portfolio WHERE student_id = ?';
  const params: any[] = [studentId];
  if (schoolYearId) {
    query += ' AND school_year_id = ?';
    params.push(schoolYearId);
  }
  query += ' ORDER BY created_at DESC';
  const rows = db.prepare(query).all(...params);
  return rows.map(mapPortfolioItem);
});

ipcMain.handle(IPC_CHANNELS.CREATE_PORTFOLIO_ITEM, (_event, input: CreatePortfolioItemInput) => {
  const db = getDatabase();
  const now = new Date().toISOString();
  const id = uuidv4();

  db.prepare(`
    INSERT INTO academy_portfolio (id, student_id, school_year_id, subject_id, lesson_id, assessment_id, title, description, item_type, file_path, content, tags, notes, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, input.studentId, input.schoolYearId, input.subjectId || null, input.lessonId || null, input.assessmentId || null,
    input.title, input.description || '', input.itemType, input.filePath || '', input.content || '',
    JSON.stringify(input.tags || []), input.notes || '', now, now,
  );

  const row = db.prepare('SELECT * FROM academy_portfolio WHERE id = ?').get(id);
  return mapPortfolioItem(row);
});

ipcMain.handle(IPC_CHANNELS.UPDATE_PORTFOLIO_ITEM, (_event, id: string, updates: Partial<PortfolioItem>) => {
  const db = getDatabase();
  const now = new Date().toISOString();

  const fields: string[] = [];
  const values: any[] = [];

  if (updates.title !== undefined) { fields.push('title = ?'); values.push(updates.title); }
  if (updates.description !== undefined) { fields.push('description = ?'); values.push(updates.description); }
  if (updates.itemType !== undefined) { fields.push('item_type = ?'); values.push(updates.itemType); }
  if (updates.filePath !== undefined) { fields.push('file_path = ?'); values.push(updates.filePath); }
  if (updates.content !== undefined) { fields.push('content = ?'); values.push(updates.content); }
  if (updates.tags !== undefined) { fields.push('tags = ?'); values.push(JSON.stringify(updates.tags)); }
  if (updates.notes !== undefined) { fields.push('notes = ?'); values.push(updates.notes); }
  if (updates.subjectId !== undefined) { fields.push('subject_id = ?'); values.push(updates.subjectId); }

  fields.push('updated_at = ?');
  values.push(now);
  values.push(id);

  db.prepare(`UPDATE academy_portfolio SET ${fields.join(', ')} WHERE id = ?`).run(...values);

  const row = db.prepare('SELECT * FROM academy_portfolio WHERE id = ?').get(id);
  return mapPortfolioItem(row);
});

ipcMain.handle(IPC_CHANNELS.DELETE_PORTFOLIO_ITEM, (_event, id: string) => {
  const db = getDatabase();
  db.prepare('DELETE FROM academy_portfolio WHERE id = ?').run(id);
});

// ─── IPC Handlers: Reports ──────────────────────────────────────────────────

ipcMain.handle(IPC_CHANNELS.GENERATE_REPORT_CARD, async (_event, input: GenerateReportCardInput) => {
  const db = getDatabase();
  const apiKeys = loadApiKeys();
  const settings = loadSettings();
  const modelId = input.model || settings.defaultModel;

  const student = mapStudent(db.prepare('SELECT * FROM academy_students WHERE id = ?').get(input.studentId));
  const schoolYear = mapSchoolYear(db.prepare('SELECT * FROM academy_school_years WHERE id = ?').get(input.schoolYearId));
  const subjects = db.prepare('SELECT * FROM academy_subjects WHERE student_id = ? AND school_year_id = ? AND is_active = 1 ORDER BY sort_order, name').all(input.studentId, input.schoolYearId).map(mapSubject);

  // Gather data for each subject
  const subjectData: Record<string, { skills: any[]; assessments: any[]; lessonsCompleted: number; totalHours: number }> = {};
  for (const subject of subjects) {
    const skills = db.prepare('SELECT * FROM academy_skills WHERE student_id = ? AND subject_id = ?').all(input.studentId, subject.id).map(mapSkill);
    const assessments = db.prepare('SELECT * FROM academy_assessments WHERE student_id = ? AND subject_id = ? AND status = ?').all(input.studentId, subject.id, 'graded').map(mapAssessment);
    const lessonCount = db.prepare("SELECT COUNT(*) as cnt FROM academy_lessons WHERE student_id = ? AND subject_id = ? AND status = 'completed'").get(input.studentId, subject.id) as any;
    const hourSum = db.prepare("SELECT COALESCE(SUM(actual_minutes), 0) as total FROM academy_lessons WHERE student_id = ? AND subject_id = ? AND status = 'completed'").get(input.studentId, subject.id) as any;
    subjectData[subject.id] = {
      skills,
      assessments,
      lessonsCompleted: lessonCount?.cnt || 0,
      totalHours: Math.round((hourSum?.total || 0) / 60 * 10) / 10,
    };
  }

  // Reading data
  const readingEntries = db.prepare('SELECT * FROM academy_reading_log WHERE student_id = ? AND school_year_id = ?').all(input.studentId, input.schoolYearId).map(mapReadingEntry);

  // Attendance
  const attendanceRows = db.prepare('SELECT * FROM academy_attendance WHERE student_id = ? AND school_year_id = ?').all(input.studentId, input.schoolYearId).map(mapAttendance);

  const now = new Date().toISOString();
  const response = await generateReportCard(student, schoolYear, subjects, subjectData, readingEntries, attendanceRows, input.period, input.style, modelId, apiKeys);

  // Log AI usage
  const logId = uuidv4();
  db.prepare(`INSERT INTO academy_ai_log (id, student_id, feature, model_used, tokens_in, tokens_out, cost, response_time_ms, created_at) VALUES (?, ?, 'report_card', ?, ?, ?, ?, ?, ?)`).run(logId, input.studentId, modelId, response.tokensIn, response.tokensOut, response.cost, response.responseTimeMs, now);

  return {
    html: response.content,
    studentName: student.name,
    period: input.period,
    style: input.style,
    generatedAt: now,
  } as ReportCard;
});

ipcMain.handle(IPC_CHANNELS.GENERATE_TRANSCRIPT, async (_event, input: GenerateTranscriptInput) => {
  const db = getDatabase();
  const apiKeys = loadApiKeys();
  const settings = loadSettings();
  const modelId = input.model || settings.defaultModel;

  const student = mapStudent(db.prepare('SELECT * FROM academy_students WHERE id = ?').get(input.studentId));

  // Get school years (all or specific)
  let schoolYears: SchoolYear[];
  if (input.schoolYearIds && input.schoolYearIds.length > 0) {
    schoolYears = input.schoolYearIds.map(id => mapSchoolYear(db.prepare('SELECT * FROM academy_school_years WHERE id = ?').get(id)));
  } else {
    schoolYears = db.prepare('SELECT * FROM academy_school_years WHERE student_id = ? ORDER BY start_date').all(input.studentId).map(mapSchoolYear);
  }

  // For each school year, gather subjects + grades
  const yearData: Record<string, { subjects: Subject[]; subjectData: Record<string, { assessments: any[]; lessonsCompleted: number; totalHours: number }> }> = {};
  for (const year of schoolYears) {
    const subjects = db.prepare('SELECT * FROM academy_subjects WHERE student_id = ? AND school_year_id = ? ORDER BY sort_order, name').all(input.studentId, year.id).map(mapSubject);
    const sd: Record<string, any> = {};
    for (const subject of subjects) {
      const assessments = db.prepare('SELECT * FROM academy_assessments WHERE student_id = ? AND subject_id = ? AND status = ?').all(input.studentId, subject.id, 'graded').map(mapAssessment);
      const lessonCount = db.prepare("SELECT COUNT(*) as cnt FROM academy_lessons WHERE student_id = ? AND subject_id = ? AND status = 'completed'").get(input.studentId, subject.id) as any;
      const hourSum = db.prepare("SELECT COALESCE(SUM(actual_minutes), 0) as total FROM academy_lessons WHERE student_id = ? AND subject_id = ? AND status = 'completed'").get(input.studentId, subject.id) as any;
      sd[subject.id] = { assessments, lessonsCompleted: lessonCount?.cnt || 0, totalHours: Math.round((hourSum?.total || 0) / 60 * 10) / 10 };
    }
    yearData[year.id] = { subjects, subjectData: sd };
  }

  // Attendance per year
  const attendanceByYear: Record<string, number> = {};
  for (const year of schoolYears) {
    const count = db.prepare("SELECT COUNT(*) as cnt FROM academy_attendance WHERE student_id = ? AND school_year_id = ? AND status != 'absent'").get(input.studentId, year.id) as any;
    attendanceByYear[year.id] = count?.cnt || 0;
  }

  const now = new Date().toISOString();
  const response = await generateTranscript(student, schoolYears, yearData, attendanceByYear, modelId, apiKeys);

  const logId = uuidv4();
  db.prepare(`INSERT INTO academy_ai_log (id, student_id, feature, model_used, tokens_in, tokens_out, cost, response_time_ms, created_at) VALUES (?, ?, 'transcript', ?, ?, ?, ?, ?, ?)`).run(logId, input.studentId, modelId, response.tokensIn, response.tokensOut, response.cost, response.responseTimeMs, now);

  return {
    html: response.content,
    studentName: student.name,
    schoolYears: schoolYears.map(y => y.name),
    generatedAt: now,
  } as Transcript;
});

ipcMain.handle(IPC_CHANNELS.GENERATE_YEAR_END_REPORT, async (_event, studentId: string, schoolYearId: string, model?: string) => {
  const db = getDatabase();
  const apiKeys = loadApiKeys();
  const settings = loadSettings();
  const modelId = model || settings.defaultModel;

  const student = mapStudent(db.prepare('SELECT * FROM academy_students WHERE id = ?').get(studentId));
  const schoolYear = mapSchoolYear(db.prepare('SELECT * FROM academy_school_years WHERE id = ?').get(schoolYearId));
  const subjects = db.prepare('SELECT * FROM academy_subjects WHERE student_id = ? AND school_year_id = ? AND is_active = 1 ORDER BY sort_order, name').all(studentId, schoolYearId).map(mapSubject);

  // Subject data
  const subjectData: Record<string, { skills: any[]; assessments: any[]; lessonsCompleted: number; totalHours: number }> = {};
  for (const subject of subjects) {
    const skills = db.prepare('SELECT * FROM academy_skills WHERE student_id = ? AND subject_id = ?').all(studentId, subject.id).map(mapSkill);
    const assessments = db.prepare('SELECT * FROM academy_assessments WHERE student_id = ? AND subject_id = ?').all(studentId, subject.id).map(mapAssessment);
    const lessonCount = db.prepare("SELECT COUNT(*) as cnt FROM academy_lessons WHERE student_id = ? AND subject_id = ? AND status = 'completed'").get(studentId, subject.id) as any;
    const hourSum = db.prepare("SELECT COALESCE(SUM(actual_minutes), 0) as total FROM academy_lessons WHERE student_id = ? AND subject_id = ? AND status = 'completed'").get(studentId, subject.id) as any;
    subjectData[subject.id] = { skills, assessments, lessonsCompleted: lessonCount?.cnt || 0, totalHours: Math.round((hourSum?.total || 0) / 60 * 10) / 10 };
  }

  const readingEntries = db.prepare('SELECT * FROM academy_reading_log WHERE student_id = ? AND school_year_id = ?').all(studentId, schoolYearId).map(mapReadingEntry);
  const attendanceRows = db.prepare('SELECT * FROM academy_attendance WHERE student_id = ? AND school_year_id = ?').all(studentId, schoolYearId).map(mapAttendance);
  const portfolio = db.prepare('SELECT * FROM academy_portfolio WHERE student_id = ? AND school_year_id = ? ORDER BY created_at').all(studentId, schoolYearId).map(mapPortfolioItem);

  const now = new Date().toISOString();
  const response = await generateYearEndReport(student, schoolYear, subjects, subjectData, readingEntries, attendanceRows, portfolio, modelId, apiKeys);

  const logId = uuidv4();
  db.prepare(`INSERT INTO academy_ai_log (id, student_id, feature, model_used, tokens_in, tokens_out, cost, response_time_ms, created_at) VALUES (?, ?, 'year_end_report', ?, ?, ?, ?, ?, ?)`).run(logId, studentId, modelId, response.tokensIn, response.tokensOut, response.cost, response.responseTimeMs, now);

  return response.content;
});

// ─── IPC Handlers: NS Vault ─────────────────────────────────────────────────

ipcMain.handle(IPC_CHANNELS.VAULT_LIST, (_event, options) => {
  return vaultList(options);
});

ipcMain.handle(IPC_CHANNELS.VAULT_STORE, (_event, input) => {
  return vaultStore(input);
});

ipcMain.handle(IPC_CHANNELS.VAULT_GET, (_event, id: string) => {
  return vaultGet(id);
});

ipcMain.handle(IPC_CHANNELS.VAULT_DELETE, (_event, id: string) => {
  vaultDelete(id);
});

ipcMain.handle(IPC_CHANNELS.VAULT_SEARCH, (_event, options) => {
  return vaultSearch(options);
});

ipcMain.handle(IPC_CHANNELS.VAULT_GET_TAGS, () => {
  return vaultGetTags();
});

ipcMain.handle(IPC_CHANNELS.VAULT_ADD_TAG, (_event, itemId: string, tagName: string, color?: string) => {
  vaultAddTag(itemId, tagName, color);
});

ipcMain.handle(IPC_CHANNELS.VAULT_ANNOTATE, (_event, itemId: string, content: string) => {
  return vaultAnnotate(itemId, content);
});

ipcMain.handle(IPC_CHANNELS.VAULT_GET_ANNOTATIONS, (_event, itemId: string) => {
  return vaultGetAnnotations(itemId);
});

ipcMain.handle(IPC_CHANNELS.VAULT_GET_PROVENANCE, (_event, itemId: string) => {
  return vaultGetProvenance(itemId);
});

// ─── IPC Handlers: Macro Registry ───────────────────────────────────────────

ipcMain.handle(IPC_CHANNELS.MACRO_GET_REGISTRY, () => getRegistry());
ipcMain.handle(IPC_CHANNELS.MACRO_GET_AVAILABLE, () => getAvailableMacros());

// ─── IPC Handlers: Cross-App Queue ──────────────────────────────────────────

ipcMain.handle(IPC_CHANNELS.MACRO_INVOKE, (_event, targetApp: string, macro: string, input: any, vaultParentId?: string) => {
  return sendMacroRequest(targetApp, macro, input, vaultParentId);
});

ipcMain.handle(IPC_CHANNELS.MACRO_INVOKE_STATUS, (_event, requestId: string) => {
  return checkMacroResponse(requestId);
});

ipcMain.handle(IPC_CHANNELS.MACRO_GET_PENDING, () => {
  return getPendingRequests();
});

// ─── IPC Handlers: Orchestrations ────────────────────────────────────────────

ipcMain.handle(IPC_CHANNELS.ORCH_LIST, () => listOrchestrations());
ipcMain.handle(IPC_CHANNELS.ORCH_CREATE, (_event, data) => createOrchestration(data));
ipcMain.handle(IPC_CHANNELS.ORCH_UPDATE, (_event, id: string, updates) => updateOrchestration(id, updates));
ipcMain.handle(IPC_CHANNELS.ORCH_DELETE, (_event, id: string) => { deleteOrchestration(id); });
ipcMain.handle(IPC_CHANNELS.ORCH_GET, (_event, id: string) => getOrchestration(id));
ipcMain.handle(IPC_CHANNELS.ORCH_RUN, (_event, orchestrationId: string, manualInput?: string) => runOrchestration(orchestrationId, manualInput));
ipcMain.handle(IPC_CHANNELS.ORCH_RESUME, (_event, runId: string, decision: string) => resumeOrchestration(runId, decision as 'approved' | 'rejected'));
ipcMain.handle(IPC_CHANNELS.ORCH_GET_RUNS, (_event, orchestrationId: string) => listRuns(orchestrationId));
ipcMain.handle(IPC_CHANNELS.ORCH_GET_RUN, (_event, runId: string) => getRun(runId));

// ─── IPC Handlers: Window Controls ──────────────────────────────────────────

ipcMain.on(IPC_CHANNELS.MINIMIZE_WINDOW, () => {
  const win = BrowserWindow.getFocusedWindow();
  win?.minimize();
});

ipcMain.on(IPC_CHANNELS.MAXIMIZE_WINDOW, () => {
  const win = BrowserWindow.getFocusedWindow();
  if (win?.isMaximized()) {
    win.unmaximize();
  } else {
    win?.maximize();
  }
});

ipcMain.on(IPC_CHANNELS.CLOSE_WINDOW, () => {
  const win = BrowserWindow.getFocusedWindow();
  win?.close();
});
