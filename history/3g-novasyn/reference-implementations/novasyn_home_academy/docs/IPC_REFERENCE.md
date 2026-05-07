# NovaSyn Academy — IPC Reference

All communication between renderer and main process goes through typed IPC channels.

**Pattern**: `types.ts` (interface + channels) → `preload/index.ts` (bridge) → `main/index.ts` (handlers)

---

## Sprint 1 Channels

### Settings & System (4 channels)

| Channel | Direction | Params | Returns | Description |
|---------|-----------|--------|---------|-------------|
| `GET_SETTINGS` | invoke | — | `Settings` | Load app settings from JSON file |
| `SAVE_SETTINGS` | invoke | `Partial<Settings>` | `Settings` | Update settings, merge with existing |
| `GET_API_KEYS` | invoke | — | `Record<string, string>` | Load shared API keys from `%APPDATA%/NovaSyn/api-keys.json` |
| `GET_MODELS` | invoke | — | `AIModel[]` | Return available AI models |

### Students (4 channels)

| Channel | Direction | Params | Returns | Description |
|---------|-----------|--------|---------|-------------|
| `GET_STUDENTS` | invoke | — | `Student[]` | All active students |
| `CREATE_STUDENT` | invoke | `CreateStudentInput` | `Student` | Create new student profile |
| `UPDATE_STUDENT` | invoke | `id: string, updates: Partial<Student>` | `Student` | Update student profile |
| `DELETE_STUDENT` | invoke | `id: string` | `void` | Soft-delete (set is_active = 0) |

### School Years (4 channels)

| Channel | Direction | Params | Returns | Description |
|---------|-----------|--------|---------|-------------|
| `GET_SCHOOL_YEARS` | invoke | `studentId: string` | `SchoolYear[]` | School years for a student |
| `CREATE_SCHOOL_YEAR` | invoke | `CreateSchoolYearInput` | `SchoolYear` | Create new school year |
| `UPDATE_SCHOOL_YEAR` | invoke | `id: string, updates: Partial<SchoolYear>` | `SchoolYear` | Update school year |
| `DELETE_SCHOOL_YEAR` | invoke | `id: string` | `void` | Delete school year + cascade |

### Subjects (4 channels)

| Channel | Direction | Params | Returns | Description |
|---------|-----------|--------|---------|-------------|
| `GET_SUBJECTS` | invoke | `studentId: string` | `Subject[]` | Subjects for a student (current year) |
| `CREATE_SUBJECT` | invoke | `CreateSubjectInput` | `Subject` | Create new subject |
| `UPDATE_SUBJECT` | invoke | `id: string, updates: Partial<Subject>` | `Subject` | Update subject |
| `DELETE_SUBJECT` | invoke | `id: string` | `void` | Delete subject + cascade lessons |

### Lessons (6 channels)

| Channel | Direction | Params | Returns | Description |
|---------|-----------|--------|---------|-------------|
| `GET_LESSONS` | invoke | `{ studentId, date?, subjectId? }` | `Lesson[]` | Lessons filtered by student + optional date/subject |
| `CREATE_LESSON` | invoke | `CreateLessonInput` | `Lesson` | Create single lesson |
| `UPDATE_LESSON` | invoke | `id: string, updates: Partial<Lesson>` | `Lesson` | Update lesson (status, notes, actual_minutes) |
| `DELETE_LESSON` | invoke | `id: string` | `void` | Delete lesson |
| `COMPLETE_LESSON` | invoke | `id: string, notes?: string, actualMinutes?: number` | `Lesson` | Mark lesson completed + auto-update attendance |
| `GENERATE_LESSONS` | invoke | `GenerateLessonsInput` | `Lesson[]` | AI generates lesson plans for a day or week |

### Attendance (2 channels)

| Channel | Direction | Params | Returns | Description |
|---------|-----------|--------|---------|-------------|
| `GET_ATTENDANCE` | invoke | `{ studentId, startDate?, endDate? }` | `Attendance[]` | Attendance records |
| `UPDATE_ATTENDANCE` | invoke | `id: string, updates: Partial<Attendance>` | `Attendance` | Manual attendance edit |

### AI Log (1 channel)

| Channel | Direction | Params | Returns | Description |
|---------|-----------|--------|---------|-------------|
| `GET_AI_COST_SUMMARY` | invoke | — | `AICostSummary` | Total cost, calls by feature, cost by model |

### Window Controls (3 channels)

| Channel | Direction | Params | Returns | Description |
|---------|-----------|--------|---------|-------------|
| `MINIMIZE_WINDOW` | send | — | — | Minimize window |
| `MAXIMIZE_WINDOW` | send | — | — | Toggle maximize |
| `CLOSE_WINDOW` | send | — | — | Close window |

---

## Sprint 1 Total: 28 IPC Channels

---

## Sprint 2 Channels

### Skills (4 channels)

| Channel | Direction | Params | Returns | Description |
|---------|-----------|--------|---------|-------------|
| `GET_SKILLS` | invoke | `studentId: string, subjectId?: string` | `Skill[]` | Skills for a student, optionally filtered by subject |
| `CREATE_SKILL` | invoke | `CreateSkillInput` | `Skill` | Create new skill |
| `UPDATE_SKILL` | invoke | `id: string, updates: Partial<Skill>` | `Skill` | Update skill proficiency/notes |
| `DELETE_SKILL` | invoke | `id: string` | `void` | Delete skill |

### Assessments (6 channels)

| Channel | Direction | Params | Returns | Description |
|---------|-----------|--------|---------|-------------|
| `GET_ASSESSMENTS` | invoke | `studentId: string, subjectId?: string` | `Assessment[]` | Assessments for a student |
| `CREATE_ASSESSMENT` | invoke | `CreateAssessmentInput` | `Assessment` | Create manual assessment |
| `UPDATE_ASSESSMENT` | invoke | `id: string, updates: Partial<Assessment>` | `Assessment` | Update assessment |
| `DELETE_ASSESSMENT` | invoke | `id: string` | `void` | Delete assessment |
| `GENERATE_ASSESSMENT` | invoke | `GenerateAssessmentInput` | `Assessment` | AI generates quiz/test from recent lessons |
| `GRADE_ASSESSMENT` | invoke | `id: string, answers: AssessmentAnswer[]` | `Assessment` | Grade assessment + auto-update skill levels + auto-award XP |

### Reading Log (4 channels)

| Channel | Direction | Params | Returns | Description |
|---------|-----------|--------|---------|-------------|
| `GET_READING_LOG` | invoke | `studentId: string` | `ReadingEntry[]` | All reading entries for a student |
| `CREATE_READING_ENTRY` | invoke | `CreateReadingEntryInput` | `ReadingEntry` | Add a book to the log |
| `UPDATE_READING_ENTRY` | invoke | `id: string, updates: Partial<ReadingEntry>` | `ReadingEntry` | Update reading progress/status + auto-award XP on completion |
| `DELETE_READING_ENTRY` | invoke | `id: string` | `void` | Delete reading entry |

### Progress (1 channel)

| Channel | Direction | Params | Returns | Description |
|---------|-----------|--------|---------|-------------|
| `GET_PROGRESS_DATA` | invoke | `studentId: string` | `ProgressData` | Aggregated progress: skills by subject, assessment scores, reading stats |

---

## Sprint 2 Total: 15 channels (cumulative: 43)

---

## Sprint 3 Channels

### Tutor Sessions (9 channels)

| Channel | Direction | Params | Returns | Description |
|---------|-----------|--------|---------|-------------|
| `CREATE_TUTOR_SESSION` | invoke | `CreateTutorSessionInput` | `TutorSession` | Start new tutor session |
| `GET_TUTOR_SESSIONS` | invoke | `studentId: string` | `TutorSession[]` | All sessions for a student |
| `GET_TUTOR_SESSION` | invoke | `id: string` | `TutorSession` | Single session details |
| `SEND_TUTOR_MESSAGE` | invoke | `SendTutorMessageInput` | `TutorMessage` | Send student message, triggers AI response stream |
| `END_TUTOR_SESSION` | invoke | `id: string` | `TutorSession` | End active session |
| `DELETE_TUTOR_SESSION` | invoke | `id: string` | `void` | Delete session + messages |
| `GET_TUTOR_MESSAGES` | invoke | `sessionId: string` | `TutorMessage[]` | All messages in a session |
| `TUTOR_STREAM_CHUNK` | send (main→renderer) | — | `TutorStreamChunk` | Real-time streaming chunks from AI tutor |

Streaming: `TUTOR_STREAM_CHUNK` is sent from main to renderer via `BrowserWindow.webContents.send()`. The renderer listens via `onTutorChunk`/`offTutorChunk`. Chunk types: `chunk` (content delta), `done` (final message + session), `error`, `filtered` (safety block).

### Resources (4 channels)

| Channel | Direction | Params | Returns | Description |
|---------|-----------|--------|---------|-------------|
| `GET_RESOURCES` | invoke | `studentId: string` | `Resource[]` | All resources for a student |
| `CREATE_RESOURCE` | invoke | `CreateResourceInput` | `Resource` | Create manual resource |
| `GENERATE_RESOURCE` | invoke | `GenerateResourceInput` | `Resource` | AI generates printable resource |
| `DELETE_RESOURCE` | invoke | `id: string` | `void` | Delete resource |

### PDF / Print (2 channels)

| Channel | Direction | Params | Returns | Description |
|---------|-----------|--------|---------|-------------|
| `EXPORT_PDF` | invoke | `html: string, title: string` | `string \| null` | Render HTML in hidden window → printToPDF → save dialog |
| `PRINT_RESOURCE` | invoke | `html: string` | `void` | Render HTML in hidden window → system print dialog |

---

## Sprint 3 Total: 15 channels (cumulative: 58)

---

## Sprint 4 Channels

### Gamification (12 channels)

| Channel | Direction | Params | Returns | Description |
|---------|-----------|--------|---------|-------------|
| `GET_GAMIFICATION_STATE` | invoke | `studentId: string` | `GamificationState` | Aggregate state: settings, totalXp, level, streak, badges, recentXp, todayXp, activeGoals |
| `GET_GAMIFICATION_SETTINGS` | invoke | `studentId: string` | `GamificationSettings` | Per-student gamification config (auto-creates defaults) |
| `SAVE_GAMIFICATION_SETTINGS` | invoke | `studentId: string, updates: Partial<GamificationSettings>` | `GamificationSettings` | Update gamification settings |
| `AWARD_XP` | invoke | `studentId: string, amount: number, reason: string, category: string` | `XPAwardResult` | Award XP + check level up + update goal progress |
| `GET_XP_LOG` | invoke | `studentId: string` | `XPLogEntry[]` | Recent XP history (last 50) |
| `GET_BADGES` | invoke | `studentId: string` | `BadgeEarned[]` | All earned badges |
| `CHECK_BADGES` | invoke | `studentId: string` | `BadgeEarned[]` | Evaluate and award eligible badges |
| `UPDATE_STREAK` | invoke | `studentId: string` | `StreakInfo` | Update streak (with weekend-gap tolerance) |
| `GET_GOALS` | invoke | `studentId: string` | `Goal[]` | All goals for a student |
| `CREATE_GOAL` | invoke | `CreateGoalInput` | `Goal` | Create new XP goal |
| `UPDATE_GOAL` | invoke | `id: string, updates: Partial<Goal>` | `Goal` | Update goal |
| `DELETE_GOAL` | invoke | `id: string` | `void` | Delete goal |

### Multi-Child Schedule (1 channel)

| Channel | Direction | Params | Returns | Description |
|---------|-----------|--------|---------|-------------|
| `GENERATE_MULTI_CHILD_SCHEDULE` | invoke | `GenerateMultiChildScheduleInput` | `Lesson[]` | AI generates coordinated schedule for multiple children |

---

## Sprint 4 Total: 13 channels (cumulative: 71)

---

## Auto-XP Hooks

These existing handlers automatically award XP when gamification is enabled:

| Handler | XP Awarded | Category |
|---------|-----------|----------|
| `COMPLETE_LESSON` | `xpCompleteLesson` (default 15) + `xpCompleteDaily` bonus if all daily lessons done | `lesson` |
| `GRADE_ASSESSMENT` | `xpAssessmentPerfect` (default 50) for 100% or `xpAssessmentPass` (default 25) for 80%+ | `assessment` |
| `UPDATE_READING_ENTRY` | `xpReadingSession` (default 10) when status changes to `completed` | `reading` |

---

## Input Types

```typescript
interface CreateStudentInput {
  name: string;
  birthDate?: string;
  gradeLevel?: string;
  state?: string;
  avatarEmoji?: string;
  interests?: string[];
  learningStyle?: Record<string, number>;
  strengths?: string[];
  struggles?: string[];
  notes?: string;
  teachingPhilosophy?: string;
}

interface CreateSchoolYearInput {
  studentId: string;
  name: string;
  startDate: string;
  endDate: string;
  targetSchoolDays?: number;
}

interface CreateSubjectInput {
  studentId: string;
  schoolYearId: string;
  name: string;
  color?: string;
  targetHoursPerWeek?: number;
  philosophy?: string;
}

interface CreateLessonInput {
  studentId: string;
  subjectId: string;
  schoolYearId: string;
  title: string;
  description?: string;
  scheduledDate?: string;
  estimatedMinutes?: number;
  lessonContent?: string;
  materialsNeeded?: string[];
  objectives?: string[];
  sortOrder?: number;
}

interface GenerateLessonsInput {
  studentId: string;
  date: string;
  scope: 'day' | 'week';
  subjectIds?: string[];
  model?: string;
}

interface CreateSkillInput {
  studentId: string;
  subjectId: string;
  name: string;
  proficiency?: number;
  notes?: string;
}

interface CreateAssessmentInput {
  studentId: string;
  subjectId: string;
  schoolYearId: string;
  title: string;
  assessmentType?: 'quiz' | 'test' | 'exam';
}

interface GenerateAssessmentInput {
  studentId: string;
  subjectId: string;
  schoolYearId: string;
  title?: string;
  questionCount?: number;
  model?: string;
}

interface CreateReadingEntryInput {
  studentId: string;
  schoolYearId: string;
  title: string;
  author?: string;
  genre?: string;
  totalPages?: number;
  startDate?: string;
}

interface CreateTutorSessionInput {
  studentId: string;
  schoolYearId: string;
  subjectId?: string;
  topic: string;
  mode?: 'guided' | 'free' | 'review';
  model?: string;
}

interface SendTutorMessageInput {
  sessionId: string;
  content: string;
}

interface CreateResourceInput {
  studentId: string;
  schoolYearId: string;
  subjectId?: string;
  title: string;
  resourceType: string;
  topic?: string;
  difficulty?: string;
  content?: string;
  answerKey?: string;
}

interface GenerateResourceInput {
  studentId: string;
  schoolYearId: string;
  subjectId?: string;
  resourceType: 'worksheet' | 'flashcards' | 'quiz' | 'coloring' | 'puzzle';
  topic: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  model?: string;
}

interface CreateGoalInput {
  studentId: string;
  title: string;
  goalType?: 'weekly' | 'monthly' | 'custom';
  targetXp: number;
  rewardText?: string;
  startDate: string;
  endDate: string;
}

interface GenerateMultiChildScheduleInput {
  studentIds: string[];
  date: string;
  scope: 'day' | 'week';
  model?: string;
}
```

---

## Future Sprint Channels

| Sprint | Feature | Channels |
|--------|---------|----------|
| 5 | Compliance | GET_COMPLIANCE, UPDATE_COMPLIANCE_STATUS |
| 5 | Portfolio | GET_PORTFOLIO, ADD_PORTFOLIO_ITEM, GENERATE_REPORT_CARD, GENERATE_TRANSCRIPT |
