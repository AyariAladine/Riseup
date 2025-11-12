import mongoose from 'mongoose';

const ReclamationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      maxlength: 200,
    },
    description: {
      type: String,
      required: true,
      maxlength: 2000,
    },
    status: {
      type: String,
      enum: ['pending', 'in-progress', 'resolved', 'closed'],
      default: 'pending',
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium',
    },
    category: {
      type: String,
      enum: ['bug', 'feature-request', 'support', 'billing', 'other'],
      default: 'other',
    },
    adminNotes: {
      type: String,
      maxlength: 1000,
      default: '',
    },
    // Chatbot fields
    chatHistory: [
      {
        role: {
          type: String,
          enum: ['user', 'assistant', 'admin'],
          required: true,
        },
        content: {
          type: String,
          required: true,
          maxlength: 2000,
        },
        timestamp: {
          type: Date,
          default: Date.now,
        },
        sourceModel: {
          type: String,
          enum: ['groq', 'heuristic', 'admin', 'system'],
          default: 'admin',
        },
      },
    ],
    suggestedSolutions: {
      type: [String],
      default: [],
    },
    resolution: {
      type: String,
      maxlength: 2000,
      default: '',
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
    aiAnalysis: {
      intent: String,
      sentiment: {
        type: String,
        enum: ['positive', 'negative', 'neutral'],
        default: 'neutral',
      },
      priority_suggested: {
        type: String,
        enum: ['low', 'medium', 'high'],
        default: 'medium',
      },
      confidence: {
        type: Number,
        min: 0,
        max: 1,
        default: 0,
      },
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.Reclamation || mongoose.model('Reclamation', ReclamationSchema);
