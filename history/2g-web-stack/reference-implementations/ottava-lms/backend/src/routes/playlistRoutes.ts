import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import * as playlistController from '../controllers/playlistController';
import * as progressController from '../controllers/playlistProgressController';
import {
  validatePlaylistListQuery,
  validatePlaylistIdParam,
  validatePlaylistCreate,
  validatePlaylistUpdate,
  validatePlaylistItemAdd,
  validatePlaylistItemIdParam,
  validatePlaylistItemReorder,
} from '../middleware/validation';

const router = Router();

router.use(authenticate);

router.get('/', validatePlaylistListQuery, playlistController.listPlaylists);
router.get('/:id', validatePlaylistIdParam, playlistController.getPlaylistDetails);

router.post(
  '/',
  requireRole('admin', 'manager'),
  validatePlaylistCreate,
  playlistController.createPlaylist
);

router.put(
  '/:id',
  requireRole('admin', 'manager'),
  validatePlaylistIdParam,
  validatePlaylistUpdate,
  playlistController.updatePlaylist
);

router.delete(
  '/:id',
  requireRole('admin'),
  validatePlaylistIdParam,
  playlistController.deletePlaylist
);

router.post(
  '/:id/items',
  requireRole('admin', 'manager'),
  validatePlaylistIdParam,
  validatePlaylistItemAdd,
  playlistController.addItemToPlaylist
);

router.put(
  '/:id/items/:itemId',
  requireRole('admin', 'manager'),
  validatePlaylistIdParam,
  validatePlaylistItemIdParam,
  validatePlaylistItemReorder,
  playlistController.reorderPlaylistItem
);

router.delete(
  '/:id/items/:itemId',
  requireRole('admin', 'manager'),
  validatePlaylistIdParam,
  validatePlaylistItemIdParam,
  playlistController.removePlaylistItem
);

router.get('/progress', progressController.getUserPlaylists);
router.get('/:id/progress', validatePlaylistIdParam, progressController.getPlaylistProgress);
router.post('/:id/start', validatePlaylistIdParam, progressController.startPlaylist);
router.post('/:id/advance', validatePlaylistIdParam, progressController.advancePlaylist);

export default router;
