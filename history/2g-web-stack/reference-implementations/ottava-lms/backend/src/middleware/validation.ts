import { body, param, query, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';

const handleValidationErrors = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array(),
    });
  }
  return next();
};

export const validateRegister = [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('organization_id').isUUID(),
  handleValidationErrors,
];

export const validateLogin = [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
  handleValidationErrors,
];

export const validateImageGeneration = [
  body('training_module_id').optional().isUUID(),
  body('reminder_phrase').trim().notEmpty().isLength({ max: 500 }),
  body('prompt').optional().trim().isLength({ max: 2000 }),
  body('negative_prompt').optional().trim().isLength({ max: 2000 }),
  body('size').optional().isIn(['1024x1024', '1792x1024', '1024x1792']),
  body('quality').optional().isIn(['standard', 'hd']),
  body('style').optional().isIn(['vivid', 'natural']),
  handleValidationErrors,
];

export const validateVideoGeneration = [
  body('source_image_id').isUUID(),
  body('animation_prompt').trim().notEmpty().isLength({ max: 1000 }),
  body('duration').isIn([5, 10]),
  body('resolution').isIn(['720p', '1080p', '4k']),
  handleValidationErrors,
];

export const validateQuizSubmit = [
  body('video_id').isUUID(),
  body('quiz_id').isUUID(),
  body('answers').isObject(),
  handleValidationErrors,
];

export const validateWatchSession = [
  body('videoId')
    .custom((value, { req }) => {
      const videoId = value || req.body.video_id;
      if (!videoId) {
        throw new Error('Video ID is required');
      }
      req.body.videoId = videoId;
      req.body.video_id = videoId;
      return true;
    })
    .bail()
    .isUUID()
    .withMessage('Video ID must be a valid UUID'),
  body('trainingModuleId')
    .custom((value, { req }) => {
      const moduleId = value || req.body.training_module_id;
      if (!moduleId) {
        return true;
      }
      req.body.training_module_id = moduleId;
      req.body.trainingModuleId = moduleId;
      return true;
    })
    .bail()
    .optional()
    .isUUID()
    .withMessage('Training module ID must be a valid UUID'),
  body('watch_percentage')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('watch_percentage must be between 0 and 100'),
  body()
    .custom((_, { req }) => {
      if (req.body.watch_percentage !== undefined) {
        req.body.watch_percentage = Number(req.body.watch_percentage);
        if (Number.isNaN(req.body.watch_percentage)) {
          throw new Error('watch_percentage must be numeric');
        }
        return true;
      }
      const watched = req.body.watchedSeconds ?? req.body.watched_seconds;
      const total = req.body.totalSeconds ?? req.body.total_seconds;
      if (watched === undefined || total === undefined) {
        throw new Error('Either watch_percentage or watchedSeconds/totalSeconds is required');
      }
      const watchedNum = Number(watched);
      const totalNum = Number(total);
      if (Number.isNaN(watchedNum) || watchedNum < 0) {
        throw new Error('watchedSeconds must be a non-negative number');
      }
      if (Number.isNaN(totalNum) || totalNum <= 0) {
        throw new Error('totalSeconds must be a positive number');
      }
      req.body.watch_percentage = (watchedNum / totalNum) * 100;
      return true;
    }),
  handleValidationErrors,
];

export const validateModuleCreate = [
  body('title').trim().notEmpty().withMessage('Title is required').isLength({ max: 200 }),
  body('description').optional().trim().isLength({ max: 2000 }),
  body('category').optional().trim().isLength({ max: 100 }),
  body('difficulty_level')
    .optional()
    .isIn(['beginner', 'intermediate', 'advanced'])
    .withMessage('Invalid difficulty level'),
  body('estimated_duration_minutes')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Duration must be positive'),
  handleValidationErrors,
];

export const validateModuleUpdate = [
  body('title').optional().trim().notEmpty().isLength({ max: 200 }),
  body('description').optional().trim().isLength({ max: 2000 }),
  body('category').optional().trim().isLength({ max: 100 }),
  body('difficulty_level')
    .optional()
    .isIn(['beginner', 'intermediate', 'advanced'])
    .withMessage('Invalid difficulty level'),
  body('estimated_duration_minutes')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Duration must be positive'),
  handleValidationErrors,
];

export const validateUUIDParam = (paramName: string) => [
  param(paramName).isUUID().withMessage(`${paramName} must be a valid UUID`),
  handleValidationErrors,
];

export const validateAddFavorite = [
  body('videoId')
    .custom((value, { req }) => {
      const videoId = value || req.body.video_id;
      if (!videoId) {
        throw new Error('Video ID is required');
      }
      req.body.videoId = videoId;
      req.body.video_id = videoId;
      return true;
    })
    .bail()
    .isUUID()
    .withMessage('Video ID must be a valid UUID'),
  handleValidationErrors,
];

export const validateVideoIdParam = [
  param('videoId')
    .custom((value, { req }) => {
      const params = req.params as Record<string, any>;
      const videoId = value || params?.video_id;
      if (!videoId) {
        throw new Error('Video ID is required');
      }
      if (params) {
        params.videoId = videoId;
        params.video_id = videoId;
      }
      return true;
    })
    .bail()
    .isUUID()
    .withMessage('Video ID must be a valid UUID'),
  handleValidationErrors,
];

export const validateMetricsQuery = [
  query('limit')
    .optional()
    .bail()
    .isInt({ min: 1, max: 1000 })
    .withMessage('Limit must be between 1 and 1000'),
  handleValidationErrors,
];

export const validateGenrePreference = [
  body('genre').trim().notEmpty().withMessage('Genre is required').isLength({ max: 50 }),
  handleValidationErrors,
];

export const validateVideoCreate = [
  body('training_module_id')
    .custom((value, { req }) => {
      const moduleId = value || req.body.trainingModuleId;
      if (!moduleId) {
        throw new Error('training_module_id must be a valid UUID');
      }
      req.body.training_module_id = moduleId;
      req.body.trainingModuleId = moduleId;
      return true;
    })
    .bail()
    .isUUID()
    .withMessage('training_module_id must be a valid UUID'),
  body('s3_url').isURL().withMessage('s3_url must be a valid URL'),
  body('genre').trim().notEmpty().withMessage('Genre is required').isLength({ max: 50 }),
  body('title').trim().notEmpty().withMessage('Title is required').isLength({ max: 200 }),
  body('description').optional().trim().isLength({ max: 2000 }),
  body('duration_seconds')
    .isInt({ min: 1 })
    .withMessage('duration_seconds must be a positive integer'),
  handleValidationErrors,
];

export const validateLyricsGeneration = [
  body('emphasis_prompt')
    .trim()
    .notEmpty()
    .withMessage('Emphasis prompt is required')
    .isLength({ max: 2000 })
    .withMessage('Emphasis prompt max 2000 chars'),
  body('policy_summary')
    .trim()
    .notEmpty()
    .withMessage('Policy summary is required')
    .isLength({ max: 50000 })
    .withMessage('Policy summary max 50000 chars'),
  handleValidationErrors,
];

export const validateOverlayGeneration = [
  body('song_lyrics')
    .trim()
    .notEmpty()
    .withMessage('Song lyrics are required')
    .isLength({ max: 10000 })
    .withMessage('Song lyrics max 10000 chars'),
  body('policy_summary')
    .trim()
    .notEmpty()
    .withMessage('Policy summary is required')
    .isLength({ max: 50000 })
    .withMessage('Policy summary max 50000 chars'),
  handleValidationErrors,
];

export const validateQuizGeneration = [
  body('policy_summary')
    .trim()
    .notEmpty()
    .withMessage('Policy summary is required')
    .isLength({ max: 50000 })
    .withMessage('Policy summary max 50000 chars'),
  body('reinforcement_phrases')
    .optional()
    .isString()
    .withMessage('Reinforcement phrases must be a string'),
  body('policy_highlight_phrases')
    .optional()
    .isString()
    .withMessage('Policy highlight phrases must be a string'),
  body('song_lyrics')
    .optional()
    .trim()
    .isLength({ max: 10000 })
    .withMessage('Song lyrics max 10000 chars'),
  handleValidationErrors,
];

export const validateSongGeneration = [
  body('training_module_id')
    .custom((value, { req }) => {
      const moduleId = value || req.body.trainingModuleId;
      if (!moduleId) {
        throw new Error('Training module ID must be a valid UUID');
      }
      req.body.training_module_id = moduleId;
      req.body.trainingModuleId = moduleId;
      return true;
    })
    .bail()
    .isUUID()
    .withMessage('Training module ID must be a valid UUID'),
  body('lyrics')
    .optional()
    .trim()
    .isLength({ max: 10000 })
    .withMessage('Lyrics max 10000 chars'),
  body('style_preset')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Style preset max 100 chars'),
  body('custom_style')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Custom style max 500 chars'),
  body('duration_ms')
    .optional()
    .isInt({ min: 5000, max: 600000 })
    .withMessage('Duration must be between 5 and 600 seconds'),
  body('emphasis_points')
    .optional()
    .isArray()
    .withMessage('Emphasis points must be an array'),
  handleValidationErrors,
];

export const validateVideoListQuery = [
  query('page')
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage('page must be between 1 and 1000'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('limit must be between 1 and 100'),
  query('genre').optional().trim().isLength({ max: 50 }).withMessage('genre max 50 chars'),
  query('training_module_id').optional().isUUID().withMessage('training_module_id must be a valid UUID'),
  query('search').optional().trim().isLength({ max: 200 }).withMessage('search max 200 chars'),
  handleValidationErrors,
];

export const validateAssetUpload = [
  body('training_module_id')
    .custom((value, { req }) => {
      const moduleId = value || req.body.trainingModuleId;
      if (!moduleId) {
        return true;
      }
      req.body.training_module_id = moduleId;
      req.body.trainingModuleId = moduleId;
      return true;
    })
    .bail()
    .optional()
    .isUUID()
    .withMessage('Training module ID must be a valid UUID'),
  body('asset_type')
    .custom((value, { req }) => {
      const assetType = value || req.body.assetType || 'audio';
      req.body.asset_type = assetType;
      req.body.assetType = assetType;
      return true;
    })
    .isIn(['audio', 'image', 'video'])
    .withMessage('Asset type must be audio, image, or video'),
  body('title')
    .custom((value, { req }) => {
      const derived = value || req.file?.originalname;
      if (!derived || !derived.trim()) {
        throw new Error('Title is required');
      }
      req.body.title = derived.trim();
      return true;
    })
    .isLength({ max: 200 })
    .withMessage('Title max 200 chars'),
  body('description').optional().trim().isLength({ max: 2000 }).withMessage('Description max 2000 chars'),
  body('style').optional().trim().isLength({ max: 100 }).withMessage('Style max 100 chars'),
  body('duration_seconds')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Duration must be positive'),
  handleValidationErrors,
];

export const validateAssetListQuery = [
  query('page')
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage('page must be between 1 and 1000'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('limit must be between 1 and 100'),
  query('type')
    .optional()
    .isIn(['audio', 'image', 'video'])
    .withMessage('type must be audio, image, or video'),
  query('training_module_id').optional().isUUID().withMessage('training_module_id must be a valid UUID'),
  query('search').optional().trim().isLength({ max: 200 }).withMessage('search max 200 chars'),
  handleValidationErrors,
];

export const validateQuizCreate = [
  body('training_module_id').optional().isUUID().withMessage('Training module ID must be a valid UUID'),
  body('video_id').optional().isUUID().withMessage('Video ID must be a valid UUID'),
  body('questions').isArray({ min: 1 }).withMessage('Questions must be a non-empty array'),
  body('questions.*.id').isString().withMessage('Question ID required'),
  body('questions.*.question').trim().notEmpty().withMessage('Question text required'),
  body('questions.*.type')
    .isIn(['multiple_choice', 'true_false', 'fill_blank'])
    .withMessage('Invalid question type'),
  body('questions.*.correct_answer').not().isEmpty().withMessage('Correct answer required'),
  body('questions.*.points').isInt({ min: 1 }).withMessage('Points must be positive'),
  body('passing_score').isInt({ min: 0, max: 100 }).withMessage('Passing score must be 0-100'),
  handleValidationErrors,
];

export const validateQuizUpdate = [
  body('questions').optional().isArray({ min: 1 }).withMessage('Questions must be a non-empty array'),
  body('questions.*.id').optional().isString().withMessage('Question ID required'),
  body('questions.*.question').optional().trim().notEmpty().withMessage('Question text required'),
  body('questions.*.type')
    .optional()
    .isIn(['multiple_choice', 'true_false', 'fill_blank'])
    .withMessage('Invalid question type'),
  body('questions.*.correct_answer')
    .optional()
    .not()
    .isEmpty()
    .withMessage('Correct answer required'),
  body('questions.*.points').optional().isInt({ min: 1 }).withMessage('Points must be positive'),
  body('passing_score').optional().isInt({ min: 0, max: 100 }).withMessage('Passing score must be 0-100'),
  handleValidationErrors,
];

export const validateAssetApproval = [
  body('training_module_id').optional().isUUID().withMessage('Training module ID must be a valid UUID'),
  handleValidationErrors,
];

export const validateAssetRejection = [
  body('reason').optional().trim().isLength({ max: 500 }).withMessage('Reason max 500 chars'),
  handleValidationErrors,
];

export const validateAssetIdParam = [
  param('id').isUUID().withMessage('Asset ID must be a valid UUID'),
  handleValidationErrors,
];

export const validateVisualAssetIdParam = [
  param('id').isUUID().withMessage('Visual asset ID must be a valid UUID'),
  handleValidationErrors,
];

export const validateVisualAssetUpdate = [
  body('training_module_id')
    .optional()
    .isUUID()
    .withMessage('Training module ID must be a valid UUID'),
  body('title')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Title max 200 chars'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Description max 2000 chars'),
  body('style')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Style max 100 chars'),
  body('duration_seconds')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Duration must be positive'),
  handleValidationErrors,
];

export const validatePlaylistListQuery = [
  query('page').optional().isInt({ min: 1, max: 1000 }).withMessage('page must be between 1 and 1000'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit must be between 1 and 100'),
  query('is_required').optional().isBoolean().withMessage('is_required must be boolean'),
  handleValidationErrors,
];

export const validatePlaylistIdParam = [
  param('id').isUUID().withMessage('Playlist id must be a valid UUID'),
  handleValidationErrors,
];

export const validatePlaylistCreate = [
  body('title')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Title must be between 1 and 200 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 5000 })
    .withMessage('Description must be under 5000 characters'),
  body('is_required').optional().isBoolean().withMessage('is_required must be boolean'),
  body('auto_play').optional().isBoolean().withMessage('auto_play must be boolean'),
  handleValidationErrors,
];

export const validatePlaylistUpdate = [
  body('title')
    .optional()
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Title must be between 1 and 200 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 5000 })
    .withMessage('Description must be under 5000 characters'),
  body('is_required').optional().isBoolean().withMessage('is_required must be boolean'),
  body('auto_play').optional().isBoolean().withMessage('auto_play must be boolean'),
  body('organization_id').not().exists().withMessage('Cannot change organization_id'),
  handleValidationErrors,
];

export const validatePlaylistItemAdd = [
  body('training_module_id').isUUID().withMessage('training_module_id must be a valid UUID'),
  body('position').optional().isInt({ min: 1 }).withMessage('position must be at least 1'),
  body('require_completion').optional().isBoolean().withMessage('require_completion must be boolean'),
  handleValidationErrors,
];

export const validatePlaylistItemIdParam = [
  param('itemId').isUUID().withMessage('itemId must be a valid UUID'),
  handleValidationErrors,
];

export const validatePlaylistItemReorder = [
  body('position').isInt({ min: 1 }).withMessage('position must be at least 1'),
  handleValidationErrors,
];

export { handleValidationErrors };
