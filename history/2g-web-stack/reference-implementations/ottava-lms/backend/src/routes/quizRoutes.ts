import { Router } from 'express';
import {
  createQuiz,
  updateQuiz,
  getQuizByVideoId,
  getQuizByTrainingModuleId,
  submitQuizAttempt,
  getQuizAttempts,
  getLatestQuizAttemptByTrainingModule
} from '../controllers/quizController';
import { authenticate, requireRole } from '../middleware/auth';
import { validateQuizCreate, validateQuizSubmit, validateQuizUpdate } from '../middleware/validation';

const router = Router();

router.use(authenticate);

// Admin and manager can create and update quizzes
router.post('/', requireRole('admin', 'manager'), validateQuizCreate, createQuiz);
router.put('/:id', requireRole('admin', 'manager'), validateQuizUpdate, updateQuiz);

// All authenticated users can view and submit quizzes
router.get('/video/:videoId', getQuizByVideoId);
router.get('/training-module/:trainingModuleId', getQuizByTrainingModuleId);
router.get('/latest/training-module/:trainingModuleId', getLatestQuizAttemptByTrainingModule);
router.post('/submit', validateQuizSubmit, submitQuizAttempt);
router.get('/attempts/:videoId', getQuizAttempts);

export default router;
