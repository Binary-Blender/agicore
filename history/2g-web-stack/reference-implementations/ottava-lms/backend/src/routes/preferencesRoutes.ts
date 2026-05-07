import { Router } from 'express';
import {
  setPreferredGenre,
  getPreferredGenre,
  clearPreferredGenre,
} from '../controllers/preferencesController';
import { authenticate } from '../middleware/auth';
import { validateGenrePreference } from '../middleware/validation';

const router = Router();

// All preferences routes require authentication
router.use(authenticate);

router.get('/genre', getPreferredGenre);
router.put('/genre', validateGenrePreference, setPreferredGenre);
router.delete('/genre', clearPreferredGenre);

export default router;
