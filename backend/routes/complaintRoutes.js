import express from 'express';
import {
  createComplaint,
  getComplaints,
  getComplaintById,
  updateComplaintStatus,
  updateComplaintPriority,
  getComplaintStats,
  exportComplaintsCSV
} from '../controllers/complaintController.js';
import { protect, authorize } from '../middleware/auth.js';
import upload from '../middleware/upload.js';

const router = express.Router();

// All complaint routes are protected
router.use(protect);

// Specific admin routes must precede param routes to avoid being treated as :id
router.get('/stats', authorize('admin'), getComplaintStats);
router.get('/export', authorize('admin'), exportComplaintsCSV);

router.route('/')
  .get(getComplaints)
  .post(authorize('resident'), upload.single('photo'), createComplaint);

router.route('/:id')
  .get(getComplaintById);

router.put('/:id/status', authorize('admin'), updateComplaintStatus);
router.put('/:id/priority', authorize('admin'), updateComplaintPriority);

export default router;
