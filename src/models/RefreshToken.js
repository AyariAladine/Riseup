import mongoose from 'mongoose';

const refreshTokenSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  jti: { type: String, required: true, unique: true },
  secretHash: { type: String, required: true },
  expiresAt: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now },
  revoked: { type: Boolean, default: false },
});

if (mongoose.models.RefreshToken) {
  try {
    delete mongoose.models.RefreshToken;
    delete mongoose.modelSchemas?.RefreshToken;
  } catch {}
}

export default mongoose.models.RefreshToken || mongoose.model('RefreshToken', refreshTokenSchema);
