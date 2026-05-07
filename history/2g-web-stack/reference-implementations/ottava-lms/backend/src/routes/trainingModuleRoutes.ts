import { Router } from 'express';
import multer from 'multer';
import {
  getAllTrainingModules,
  getTrainingModuleById,
  createTrainingModule,
  updateTrainingModule,
  deleteTrainingModule,
  getAvailableGenresForModule,
  uploadPolicyDocument,
  clearPolicyDocument,
  downloadPolicyDocument
} from '../controllers/trainingModuleController';
import { authenticate, requireRole } from '../middleware/auth';
import {
  validateModuleCreate,
  validateModuleUpdate,
  validateUUIDParam,
} from '../middleware/validation';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: parseInt(process.env.POLICY_DOCUMENT_MAX_BYTES || `${5 * 1024 * 1024}`, 10)
  }
});

// All training module routes require authentication
router.use(authenticate);

router.get('/', getAllTrainingModules);
router.get('/:id', validateUUIDParam('id'), getTrainingModuleById);
router.get('/:id/genres', getAvailableGenresForModule);
router.get('/:id/policy/download', downloadPolicyDocument);

// Admin and manager can create/update/delete training modules
router.post(
  '/',
  requireRole('admin', 'manager'),
  validateModuleCreate,
  createTrainingModule
);
router.put(
  '/:id',
  requireRole('admin', 'manager'),
  validateUUIDParam('id'),
  validateModuleUpdate,
  updateTrainingModule
);
router.delete('/:id', requireRole('admin', 'manager'), validateUUIDParam('id'), deleteTrainingModule);
router.post('/:id/policy', requireRole('admin', 'manager'), upload.single('policy'), uploadPolicyDocument);
router.delete('/:id/policy', requireRole('admin', 'manager'), clearPolicyDocument);

export default router;
