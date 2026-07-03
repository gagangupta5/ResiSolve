import Settings from '../models/Settings.js';

// @desc    Get society settings
// @route   GET /api/settings
// @access  Private
export const getSettings = async (req, res, next) => {
  try {
    let settings = await Settings.findOne();

    // If settings do not exist yet, create default settings
    if (!settings) {
      settings = await Settings.create({ overdueThresholdDays: 5 });
    }

    res.status(200).json({
      success: true,
      data: settings
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update society settings
// @route   PUT /api/settings
// @access  Private (Admin only)
export const updateSettings = async (req, res, next) => {
  try {
    const { overdueThresholdDays } = req.body;

    if (overdueThresholdDays === undefined || typeof overdueThresholdDays !== 'number' || overdueThresholdDays < 1) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid threshold in days (greater than or equal to 1)'
      });
    }

    let settings = await Settings.findOne();

    if (!settings) {
      settings = new Settings({ overdueThresholdDays });
    } else {
      settings.overdueThresholdDays = overdueThresholdDays;
    }

    await settings.save();

    res.status(200).json({
      success: true,
      data: settings
    });
  } catch (error) {
    next(error);
  }
};
