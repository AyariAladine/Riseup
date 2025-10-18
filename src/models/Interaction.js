import mongoose from 'mongoose';

const interactionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: { type: String, required: true },
  payload: { type: mongoose.Schema.Types.Mixed, default: {} },
  createdAt: { type: Date, default: Date.now },
});

const Interaction = mongoose.models.Interaction || mongoose.model('Interaction', interactionSchema);
export default Interaction;
