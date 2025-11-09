import mongoose from 'mongoose';

const gradingConversationSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true, 
    index: true 
  },
  taskId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Task', 
    default: null,
    index: true
  },
  title: { 
    type: String, 
    required: true 
  },
  messages: [{
    role: { type: String, enum: ['user', 'assistant', 'system'], required: true },
    content: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
  }],
  score: { 
    type: Number, 
    default: null,
    min: 0,
    max: 100
  },
  passed: { 
    type: Boolean, 
    default: null 
  },
  taskCompleted: { 
    type: Boolean, 
    default: false 
  },
  lastMessageAt: { 
    type: Date, 
    default: Date.now,
    index: true
  }
}, { 
  timestamps: true 
});

// Index for efficient queries
gradingConversationSchema.index({ userId: 1, lastMessageAt: -1 });
gradingConversationSchema.index({ taskId: 1, createdAt: -1 });

const GradingConversation = mongoose.models.GradingConversation || mongoose.model('GradingConversation', gradingConversationSchema);

export default GradingConversation;
