import mongoose from 'mongoose';

/**
 * UserTaskInteraction Model
 * Tracks user interactions with tasks for LightFM collaborative filtering
 */
const UserTaskInteractionSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true
    },
    taskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task',
      required: true,
      index: true
    },
    taskTitle: {
      type: String,
      required: true,
      index: true
    },
    taskDifficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard'],
      required: true,
      index: true
    },
    taskCategory: {
      type: String,
      default: 'general',
      index: true
    },
    taskSkills: [{
      type: String
    }],
    
    // Interaction data
    completed: {
      type: Boolean,
      default: false,
      index: true
    },
    score: {
      type: Number,
      min: 0,
      max: 100,
      default: null
    },
    timeSpent: {
      type: Number, // in minutes
      default: 0
    },
    attempts: {
      type: Number,
      default: 1
    },
    
    // Engagement metrics
    viewed: {
      type: Boolean,
      default: false
    },
    started: {
      type: Boolean,
      default: false
    },
    abandoned: {
      type: Boolean,
      default: false
    },
    
    // Interaction weight (for LightFM)
    // Higher weight = stronger positive signal
    interactionWeight: {
      type: Number,
      default: 1.0,
      min: 0,
      max: 10
    },
    
    // Timestamps
    firstViewedAt: {
      type: Date,
      default: Date.now
    },
    startedAt: {
      type: Date,
      default: null
    },
    completedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

// Compound indexes for efficient queries
UserTaskInteractionSchema.index({ userId: 1, taskId: 1 }, { unique: true });
UserTaskInteractionSchema.index({ userId: 1, completed: 1 });
UserTaskInteractionSchema.index({ taskDifficulty: 1, completed: 1 });
UserTaskInteractionSchema.index({ createdAt: -1 });

// Calculate interaction weight based on engagement
UserTaskInteractionSchema.methods.calculateWeight = function() {
  let weight = 0;
  
  if (this.viewed) weight += 0.5;
  if (this.started) weight += 1.0;
  if (this.completed) weight += 3.0;
  if (this.score !== null) {
    // Higher scores = higher weight
    weight += (this.score / 100) * 2.0;
  }
  // Penalize abandoned tasks
  if (this.abandoned) weight -= 1.0;
  // Penalize multiple attempts (might indicate difficulty mismatch)
  if (this.attempts > 1) weight -= (this.attempts - 1) * 0.3;
  
  this.interactionWeight = Math.max(0, Math.min(10, weight));
  return this.interactionWeight;
};

// Pre-save hook to calculate weight
UserTaskInteractionSchema.pre('save', function(next) {
  if (this.isModified('completed') || this.isModified('score') || 
      this.isModified('abandoned') || this.isModified('attempts')) {
    this.calculateWeight();
  }
  next();
});

const UserTaskInteraction = mongoose.models.UserTaskInteraction || 
  mongoose.model('UserTaskInteraction', UserTaskInteractionSchema);

export default UserTaskInteraction;

