import mongoose from 'mongoose';

const ConversationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  chatType: { type: String, enum: ['learn', 'assistant'], required: true },
  title: { type: String, default: 'New Conversation' },
  messages: [{
    role: { type: String, enum: ['user', 'assistant', 'system'], required: true },
    content: { type: String, required: true },
    source: { type: String }, // 'gemini', 'groq', 'offline', etc.
    timestamp: { type: Date, default: Date.now }
  }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Create compound index for fast lookups
ConversationSchema.index({ userId: 1, chatType: 1, createdAt: -1 });

// Update the updatedAt timestamp on save
ConversationSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

export default mongoose.models.Conversation || mongoose.model('Conversation', ConversationSchema);
