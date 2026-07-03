import mongoose from 'mongoose';

const statusHistorySchema = new mongoose.Schema({
  status: {
    type: String,
    enum: ['Open', 'In Progress', 'Resolved'],
    required: true
  },
  changedAt: {
    type: Date,
    default: Date.now
  },
  changedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  note: {
    type: String,
    default: ''
  }
}, { _id: false });

const complaintSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Complaint title is required'],
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Complaint description is required'],
    trim: true
  },
  category: {
    type: String,
    enum: ['Plumbing', 'Electrical', 'Carpentry', 'Security', 'Cleanliness', 'Elevator', 'Other'],
    required: [true, 'Complaint category is required']
  },
  resident: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  photoUrl: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['Open', 'In Progress', 'Resolved'],
    default: 'Open'
  },
  priority: {
    type: String,
    enum: ['Low', 'Medium', 'High'],
    default: 'Medium'
  },
  overdue: {
    type: Boolean,
    default: false
  },
  statusHistory: [statusHistorySchema]
}, {
  timestamps: true
});

// Auto-populate status history on creation
complaintSchema.pre('save', function(next) {
  if (this.isNew && this.statusHistory.length === 0) {
    this.statusHistory.push({
      status: this.status,
      changedBy: this.resident,
      note: 'Complaint registered successfully.'
    });
  }
  next();
});

const Complaint = mongoose.model('Complaint', complaintSchema);
export default Complaint;
