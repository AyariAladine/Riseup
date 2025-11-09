import mongoose from 'mongoose';

const TaskSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    userId: { type: String, required: true, index: true }, // For easier queries
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
    category: { type: String, default: 'general' },
    status: { type: String, enum: ['pending', 'in_progress', 'completed', 'cancelled'], default: 'pending' },
    estimatedTime: { type: Number, default: 30 }, // in minutes
    skills: [{ type: String }],
    dueDate: { type: Date },
    dueAt: { type: Date }, // Keep for backwards compatibility
    completed: { type: Boolean, default: false },
    completedAt: { type: Date },
    aiGenerated: { type: Boolean, default: false },
    aiRecommendationData: { type: mongoose.Schema.Types.Mixed },
    aiSummary: { type: String, default: '' },
    notes: { type: String, default: '' },
    progress: { type: Number, default: 0, min: 0, max: 100 },
    
    // Grading system
    score: { type: Number, min: 0, max: 100, default: null },
    gradeConversation: [{ 
      role: { type: String, enum: ['user', 'assistant', 'system'] },
      content: { type: String },
      timestamp: { type: Date, default: Date.now }
    }],
    gradedAt: { type: Date },
    
    // NFT Badge - Hedera
    nftBadgeId: { type: String, default: null }, // Hedera NFT serial number
    nftTokenId: { type: String, default: null }, // Hedera token ID
    nftTransactionHash: { type: String, default: null },
    nftMetadataUri: { type: String, default: null }, // IPFS URI for metadata
    nftMinted: { type: Boolean, default: false }
  },
  { timestamps: true }
);

// Index for calendar queries
TaskSchema.index({ userId: 1, dueDate: 1 });
TaskSchema.index({ userId: 1, status: 1 });

const Task = mongoose.models.Task || mongoose.model('Task', TaskSchema);
export default Task;