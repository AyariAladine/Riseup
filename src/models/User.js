import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  avatar: { type: String, default: '' },
  preferences: {
    theme: { type: String, enum: ['system', 'light', 'dark'], default: 'system' },
    emailNotifications: { type: Boolean, default: true },
  },
  pendingEmail: { type: String, default: '' },
  pendingEmailTokenHash: { type: String, default: '' },
  pendingEmailExpires: { type: Date, default: null },
  passwordChangeCode: { type: String, default: '' },
  passwordChangeCodeExpires: { type: Date, default: null },
  xp: { type: Number, default: 0 },
  level: { type: Number, default: 1 },
  isPremium: { type: Boolean, default: false },
  stripeCustomerId: { type: String, default: '' },
}, { timestamps: true });

const User = mongoose.models.User || mongoose.model('User', userSchema);
export default User;
