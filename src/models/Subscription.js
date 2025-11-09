import mongoose from 'mongoose';

const SubscriptionSchema = new mongoose.Schema({
  endpoint: { type: String }, // Made optional for Firebase - removed sparse from field definition
  keys: { p256dh: String, auth: String },
  fcmToken: { type: String, sparse: true, unique: true }, // Firebase Cloud Messaging token
  type: { type: String, enum: ['webpush', 'firebase'], default: 'webpush' }, // Subscription type
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Create sparse index on endpoint to allow multiple null values
SubscriptionSchema.index({ endpoint: 1 }, { sparse: true, unique: true });

// Ensure at least one of endpoint or fcmToken exists
SubscriptionSchema.pre('validate', function(next) {
  if (!this.endpoint && !this.fcmToken) {
    next(new Error('Either endpoint or fcmToken must be provided'));
  } else {
    next();
  }
});

export default mongoose.models.Subscription || mongoose.model('Subscription', SubscriptionSchema);
