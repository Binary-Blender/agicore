import { Router } from 'express';
import multer from 'multer';
import { authenticate, requireRole } from '../middleware/auth';
import {
  validateAssetApproval,
  validateAssetIdParam,
  validateAssetListQuery,
  validateAssetRejection,
  validateAssetUpload,
} from '../middleware/validation';
import {
  listApprovedAssets,
  listPendingAssets,
  uploadAsset,
  approveAsset,
  rejectAsset,
  updateAsset,
  deleteAsset,
} from '../controllers/assetController';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.use(authenticate);
router.use(requireRole('admin', 'manager'));

router.get('/', validateAssetListQuery, listApprovedAssets);
router.get('/pending', listPendingAssets);
router.post('/upload', upload.single('asset'), validateAssetUpload, uploadAsset);
router.post('/:id/approve', validateAssetIdParam, validateAssetApproval, approveAsset);
router.post('/:id/reject', validateAssetIdParam, validateAssetRejection, rejectAsset);
router.put('/:id', validateAssetIdParam, updateAsset);
router.delete('/:id', validateAssetIdParam, deleteAsset);

export default router;
