import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import {
  approveVisualAsset,
  createVideoFromImage,
  deleteVisualAssetRecord,
  generateImageAsset,
  getVideoGenerationStatus,
  listPendingVisualAssets,
  listVisualAssets,
  rejectVisualAsset,
  updateVisualAssetRecord,
} from '../controllers/visualAssetController';
import {
  validateImageGeneration,
  validateVideoGeneration,
  validateVisualAssetIdParam,
  validateVisualAssetUpdate,
} from '../middleware/validation';

const router = Router();

router.use(authenticate);
router.use(requireRole('admin', 'manager'));

router.get('/', listVisualAssets);
router.get('/pending', listPendingVisualAssets);
router.post('/images', validateImageGeneration, generateImageAsset);
router.post('/videos', validateVideoGeneration, createVideoFromImage);
router.get('/videos/:id/status', validateVisualAssetIdParam, getVideoGenerationStatus);
router.post('/:id/approve', validateVisualAssetIdParam, approveVisualAsset);
router.post('/:id/reject', validateVisualAssetIdParam, rejectVisualAsset);
router.put('/:id', validateVisualAssetIdParam, validateVisualAssetUpdate, updateVisualAssetRecord);
router.delete('/:id', validateVisualAssetIdParam, deleteVisualAssetRecord);

export default router;
