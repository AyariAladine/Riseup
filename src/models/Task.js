import mongoose from 'mongoose';

const TaskSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, trim: true },
    dueAt: { type: Date },
    completed: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const Task = mongoose.models.Task || mongoose.model('Task', TaskSchema);
export default Task;