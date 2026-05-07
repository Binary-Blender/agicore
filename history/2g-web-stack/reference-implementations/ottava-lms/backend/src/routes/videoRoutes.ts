import { Router } from 'express';
import {
  getAllVideos,
  getVideoById,
  createVideo,
  updateVideo,
  deleteVideo,
} from '../controllers/videoController';
import { authenticate, requireRole } from '../middleware/auth';
import { validateVideoCreate, validateVideoListQuery } from '../middleware/validation';

const router = Router();

// All video routes require authentication
router.use(authenticate);

router.get('/', validateVideoListQuery, getAllVideos);
router.get('/:id', getVideoById);

// Admin and manager can create/update/delete videos
router.post('/', requireRole('admin', 'manager'), validateVideoCreate, createVideo);
router.put('/:id', requireRole('admin', 'manager'), updateVideo);
router.delete('/:id', requireRole('admin', 'manager'), deleteVideo);

export default router;
