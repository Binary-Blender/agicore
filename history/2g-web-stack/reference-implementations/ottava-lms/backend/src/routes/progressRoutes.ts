import { Router } from 'express';
import {
  recordWatchSession,
  getUserProgress,
  getVideoProgress,
  getOverallStats,
} from '../controllers/progressController';
import { authenticate } from '../middleware/auth';
import { validateWatchSession } from '../middleware/validation';

const router = Router();

router.use(authenticate);

router.post('/watch', validateWatchSession, recordWatchSession);
router.get('/user', getUserProgress);
router.get('/video/:videoId', getVideoProgress);
router.get('/stats', getOverallStats);

export default router;
