const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Job title is required'],
    trim: true,
    maxlength: [100, 'Job title cannot be more than 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Job description is required'],
    trim: true,
    maxlength: [2000, 'Job description cannot be more than 2000 characters']
  },
  cost: {
    type: String,
    required: [true, 'Cost/budget is required'],
    trim: true,
    maxlength: [100, 'Cost cannot be more than 100 characters']
  },
  location: {
    type: String,
    required: [true, 'Location is required'],
    trim: true,
    maxlength: [200, 'Location cannot be more than 200 characters']
  },
  urgency: {
    type: String,
    required: [true, 'Urgency level is required'],
    enum: {
      values: ['Urgent','Normal'],
      message: 'Urgency must be one of: Urgent, Normal'
    }
  },
  scheduledDate: {
    type: Date,
    required: [true, 'Scheduled date is required'],
    validate: {
      validator: function(date) {
        return date >= new Date().setHours(0, 0, 0, 0);
      },
      message: 'Scheduled date cannot be in the past'
    }
  },
  scheduledTime: {
    type: String,
    required: [true, 'Scheduled time is required'],
    trim: true
  },
  attachments: {
    type: [String],
    validate: {
      validator: function(attachments) {
        return attachments.length <= 5;
      },
      message: 'Cannot have more than 5 attachments'
    }
  },
  status: {
    type: String,
    enum: ['open', 'completed', 'cancelled'],
    default: 'open'
  },
  postedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Job must be posted by a user']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  completedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Indexes for better performance
jobSchema.index({ postedBy: 1, createdAt: -1 });
jobSchema.index({ location: 'text', title: 'text', description: 'text' });
jobSchema.index({ scheduledDate: 1, status: 1 });
jobSchema.index({ urgency: 1, status: 1 });

// Virtual for formatted scheduled date
jobSchema.virtual('formattedScheduledDate').get(function() {
  return this.scheduledDate.toLocaleDateString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
});

// Virtual for contact info (phone number for manual contact)
jobSchema.virtual('contactInfo').get(function() {
  return this.postedBy ? this.postedBy.phoneNumber : null;
});

// Ensure virtual fields are serialized
jobSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Job', jobSchema);
