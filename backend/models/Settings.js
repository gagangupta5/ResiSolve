import mongoose from 'mongoose';

const settingsSchema = new mongoose.Schema({
  overdueThresholdDays: {
    type: Number,
    required: true,
    default: 5
  }
}, {
  timestamps: true
});

const Settings = mongoose.model('Settings', settingsSchema);
export default Settings;
