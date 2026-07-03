import mongoose from 'mongoose';

const noticeSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Notice title is required'],
    trim: true
  },
  content: {
    type: String,
    required: [true, 'Notice content is required'],
    trim: true
  },
  postedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isImportant: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

const Notice = mongoose.model('Notice', noticeSchema);
export default Notice;
