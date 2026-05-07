import { Router } from 'express';
import {
  addFavorite,
  removeFavorite,
  getUserFavorites,
  checkFavoriteStatus,
} from '../controllers/favoritesController';
import { authenticate } from '../middleware/auth';
import { validateAddFavorite, validateVideoIdParam } from '../middleware/validation';

const router = Router();

// All favorites routes require authentication
router.use(authenticate);

router.get('/', getUserFavorites);
router.get('/check/:videoId', validateVideoIdParam, checkFavoriteStatus);
router.post('/', validateAddFavorite, addFavorite);
router.delete('/:videoId', validateVideoIdParam, removeFavorite);

export default router;
