import Notice from '../models/Notice.js';
import User from '../models/User.js';
import { sendImportantNoticeEmail } from '../utils/email.js';

// @desc    Get all notices
// @route   GET /api/notices
// @access  Private
export const getNotices = async (req, res, next) => {
  try {
    // Pinned notices first, then newest first
    const notices = await Notice.find()
      .populate('postedBy', 'name email role')
      .sort({ isImportant: -1, createdAt: -1 });

    res.status(200).json({
      success: true,
      count: notices.length,
      data: notices
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new notice
// @route   POST /api/notices
// @access  Private (Admin only)
export const createNotice = async (req, res, next) => {
  try {
    const { title, content, isImportant } = req.body;

    if (!title || !content) {
      return res.status(400).json({ success: false, message: 'Please provide both title and content for the notice' });
    }

    const notice = await Notice.create({
      title,
      content,
      isImportant: isImportant || false,
      postedBy: req.user.id
    });

    // Populate notice author information
    const populatedNotice = await Notice.findById(notice._id).populate('postedBy', 'name');

    // Send email notification to all residents if the notice is important
    if (isImportant) {
      const residents = await User.find({ role: 'resident' }).select('email');
      const emails = residents.map(r => r.email).filter(Boolean);

      if (emails.length > 0) {
        // Trigger email sending asynchronously
        sendImportantNoticeEmail({
          emails,
          noticeTitle: title,
          noticeContent: content,
          authorName: req.user.name
        }).catch(err => {
          console.error('Failed to broadcast important notice emails:', err);
        });
      }
    }

    res.status(201).json({
      success: true,
      data: populatedNotice
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete notice
// @route   DELETE /api/notices/:id
// @access  Private (Admin only)
export const deleteNotice = async (req, res, next) => {
  try {
    const notice = await Notice.findById(req.params.id);

    if (!notice) {
      return res.status(404).json({ success: false, message: 'Notice not found' });
    }

    await notice.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Notice removed successfully'
    });
  } catch (error) {
    next(error);
  }
};
