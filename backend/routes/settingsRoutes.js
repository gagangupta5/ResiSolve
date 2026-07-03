import express from 'express';
import { getSettings, updateSettings } from '../controllers/settingsController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// Settings routes are protected
router.use(protect);

router.route('/')
  .get(getSettings)
  .put(authorize('admin'), updateSettings);

export default router;
