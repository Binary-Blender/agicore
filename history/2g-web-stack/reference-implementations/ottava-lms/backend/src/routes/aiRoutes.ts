import { Router } from 'express';
import multer from 'multer';
import { authenticate, requireRole } from '../middleware/auth';
import {
  validateLyricsGeneration,
  validateOverlayGeneration,
  validateQuizGeneration,
  validateSongGeneration,
} from '../middleware/validation';
import { createLyrics, createReminderText, createQuizQuestions, createTrainingSong, deleteTrainingSong } from '../controllers/aiController';
import { createVisualPrompt } from '../controllers/visualPromptController';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: parseInt(process.env.POLICY_DOCUMENT_MAX_BYTES || `${10 * 1024 * 1024}`, 10),
  },
});

router.use(authenticate);
router.use(requireRole('admin', 'manager'));

router.post('/lyrics', upload.single('policy_document'), validateLyricsGeneration, createLyrics);
router.post('/overlays', upload.single('policy_document'), validateOverlayGeneration, createReminderText);
router.post('/quiz', upload.single('policy_document'), validateQuizGeneration, createQuizQuestions);
router.post('/song', validateSongGeneration, createTrainingSong);
router.delete('/song/:id', deleteTrainingSong);
router.post('/visual/prompt', createVisualPrompt);

export default router;
