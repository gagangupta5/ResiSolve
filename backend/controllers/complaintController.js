import Complaint from '../models/Complaint.js';
import Settings from '../models/Settings.js';
import User from '../models/User.js';
import { sendComplaintStatusEmail } from '../utils/email.js';

// Helper to update overdue status dynamically
const updateOverdueStatus = async () => {
  const settings = await Settings.findOne();
  const thresholdDays = settings ? settings.overdueThresholdDays : 5;
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - thresholdDays);

  // Mark unresolved complaints created before cutoffDate as overdue
  await Complaint.updateMany(
    {
      status: { $ne: 'Resolved' },
      createdAt: { $lt: cutoffDate },
      overdue: false
    },
    { $set: { overdue: true } }
  );

  // Unmark complaints if they don't meet the condition (e.g. settings changed)
  await Complaint.updateMany(
    {
      status: 'Resolved',
      overdue: true
    },
    { $set: { overdue: false } }
  );

  await Complaint.updateMany(
    {
      status: { $ne: 'Resolved' },
      createdAt: { $gte: cutoffDate },
      overdue: true
    },
    { $set: { overdue: false } }
  );
};

// @desc    Create new complaint
// @route   POST /api/complaints
// @access  Private (Resident only)
export const createComplaint = async (req, res, next) => {
  try {
    const { title, description, category } = req.body;
    let photoUrl = '';

    if (req.file) {
      // Normalize backslashes to forward slashes for URL routing consistency
      photoUrl = req.file.path.replace(/\\/g, '/');
    }

    const complaint = await Complaint.create({
      title,
      description,
      category,
      resident: req.user.id,
      photoUrl
    });

    res.status(201).json({
      success: true,
      data: complaint
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all complaints (With filters & sorting)
// @route   GET /api/complaints
// @access  Private
export const getComplaints = async (req, res, next) => {
  try {
    // Dynamically recalculate overdue flags based on threshold
    await updateOverdueStatus();

    let query = {};

    // Residents can only see their own complaints
    if (req.user.role === 'resident') {
      query.resident = req.user.id;
    }

    // Filters for Admins
    if (req.user.role === 'admin') {
      // Filter by resident email/name (fuzzy search) or specific flat number
      if (req.query.search) {
        const matchingUsers = await User.find({
          $or: [
            { name: { $regex: req.query.search, $options: 'i' } },
            { email: { $regex: req.query.search, $options: 'i' } },
            { flatNo: { $regex: req.query.search, $options: 'i' } }
          ]
        }).select('_id');
        const userIds = matchingUsers.map(u => u._id);
        query.resident = { $in: userIds };
      }
    }

    // Filter by Category
    if (req.query.category) {
      query.category = req.query.category;
    }

    // Filter by Status
    if (req.query.status) {
      query.status = req.query.status;
    }

    // Filter by Priority
    if (req.query.priority) {
      query.priority = req.query.priority;
    }

    // Filter by Date (e.g. filter by created date)
    if (req.query.startDate && req.query.endDate) {
      query.createdAt = {
        $gte: new Date(req.query.startDate),
        $lte: new Date(req.query.endDate + 'T23:59:59.999Z')
      };
    }

    // Fetch complaints: populate resident details
    let complaints = await Complaint.find(query)
      .populate('resident', 'name email flatNo phone')
      .sort({ overdue: -1, createdAt: -1 }); // Overdue at the top, then newest first

    res.status(200).json({
      success: true,
      count: complaints.length,
      data: complaints
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single complaint details
// @route   GET /api/complaints/:id
// @access  Private
export const getComplaintById = async (req, res, next) => {
  try {
    const complaint = await Complaint.findById(req.params.id)
      .populate('resident', 'name email flatNo phone')
      .populate('statusHistory.changedBy', 'name role');

    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint not found' });
    }

    // Ensure residents can only view their own complaints
    if (req.user.role === 'resident' && complaint.resident._id.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Access denied to this complaint' });
    }

    res.status(200).json({
      success: true,
      data: complaint
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update complaint status
// @route   PUT /api/complaints/:id/status
// @access  Private (Admin only)
export const updateComplaintStatus = async (req, res, next) => {
  try {
    const { status, note } = req.body;

    if (!status || !['Open', 'In Progress', 'Resolved'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Please provide a valid status update' });
    }

    const complaint = await Complaint.findById(req.params.id).populate('resident', 'name email');

    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint not found' });
    }

    // Check if complaint is already Resolved
    if (complaint.status === 'Resolved') {
      return res.status(400).json({ success: false, message: 'Resolved complaints are closed and cannot be modified' });
    }

    // Update status and append to status history
    complaint.status = status;
    complaint.statusHistory.push({
      status,
      changedBy: req.user.id,
      note: note || `Status updated to ${status}.`
    });

    // If marked Resolved, remove overdue status
    if (status === 'Resolved') {
      complaint.overdue = false;
    }

    await complaint.save();

    // Trigger asynchronous email notification to resident
    try {
      await sendComplaintStatusEmail({
        email: complaint.resident.email,
        name: complaint.resident.name,
        complaintTitle: complaint.title,
        status: status,
        note: note
      });
    } catch (mailError) {
      console.error('Failed to send status update email:', mailError);
    }

    res.status(200).json({
      success: true,
      data: complaint
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update complaint priority
// @route   PUT /api/complaints/:id/priority
// @access  Private (Admin only)
export const updateComplaintPriority = async (req, res, next) => {
  try {
    const { priority } = req.body;

    if (!priority || !['Low', 'Medium', 'High'].includes(priority)) {
      return res.status(400).json({ success: false, message: 'Please provide a valid priority value' });
    }

    const complaint = await Complaint.findById(req.params.id);

    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint not found' });
    }

    complaint.priority = priority;
    await complaint.save();

    res.status(200).json({
      success: true,
      data: complaint
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get dashboard metrics & analytics
// @route   GET /api/complaints/stats
// @access  Private (Admin only)
export const getComplaintStats = async (req, res, next) => {
  try {
    await updateOverdueStatus();

    // Count complaints by Status
    const statusCounts = await Complaint.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    // Count complaints by Category
    const categoryCounts = await Complaint.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } }
    ]);

    // Count overdue complaints
    const overdueCount = await Complaint.countDocuments({
      status: { $ne: 'Resolved' },
      overdue: true
    });

    // Formatting counts
    const stats = {
      status: { Open: 0, 'In Progress': 0, Resolved: 0 },
      category: { Plumbing: 0, Electrical: 0, Carpentry: 0, Security: 0, Cleanliness: 0, Elevator: 0, Other: 0 },
      overdue: overdueCount
    };

    statusCounts.forEach(item => {
      if (stats.status[item._id] !== undefined) {
        stats.status[item._id] = item.count;
      }
    });

    categoryCounts.forEach(item => {
      if (stats.category[item._id] !== undefined) {
        stats.category[item._id] = item.count;
      }
    });

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Export complaints to CSV
// @route   GET /api/complaints/export
// @access  Private (Admin only)
export const exportComplaintsCSV = async (req, res, next) => {
  try {
    const complaints = await Complaint.find().populate('resident', 'name email flatNo');

    // Create CSV headers
    let csvContent = 'Complaint ID,Title,Description,Category,Resident Name,Flat No,Resident Email,Status,Priority,Overdue,Created Date\n';

    // Populate rows
    complaints.forEach(c => {
      const id = c._id.toString();
      // Replace quotes and commas to avoid breakages in CSV structure
      const title = `"${c.title.replace(/"/g, '""')}"`;
      const description = `"${c.description.replace(/"/g, '""').replace(/\n/g, ' ')}"`;
      const category = c.category;
      const residentName = c.resident ? `"${c.resident.name.replace(/"/g, '""')}"` : 'Deleted User';
      const flatNo = c.resident ? c.resident.flatNo : '';
      const residentEmail = c.resident ? c.resident.email : '';
      const status = c.status;
      const priority = c.priority;
      const overdue = c.overdue ? 'Yes' : 'No';
      const createdDate = c.createdAt.toISOString().slice(0, 10);

      csvContent += `${id},${title},${description},${category},${residentName},${flatNo},${residentEmail},${status},${priority},${overdue},${createdDate}\n`;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=society-complaints-report.csv');
    res.status(200).send(csvContent);
  } catch (error) {
    next(error);
  }
};
