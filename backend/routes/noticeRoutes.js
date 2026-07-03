import express from 'express';
import { getNotices, createNotice, deleteNotice } from '../controllers/noticeController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// All notice routes are protected
router.use(protect);

router.route('/')
  .get(getNotices)
  .post(authorize('admin'), createNotice);

router.route('/:id')
  .delete(authorize('admin'), deleteNotice);

export default router;
