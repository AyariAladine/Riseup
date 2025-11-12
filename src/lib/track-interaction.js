import { connectToDatabase } from './mongodb';
import UserTaskInteraction from '@/models/UserTaskInteraction';
import Task from '@/models/Task';
import mongoose from 'mongoose';

/**
 * Track user-task interaction for LightFM learning
 * This is a server-side helper function
 */
export async function trackInteraction({
  userId,
  taskId,
  taskTitle,
  taskDifficulty = 'medium',
  taskCategory = 'general',
  taskSkills = [],
  completed = false,
  score = null,
  timeSpent = 0,
  viewed = false,
  started = false,
  abandoned = false
}) {
  try {
    await connectToDatabase();

    // Fetch task details if not provided
    let task = null;
    if (taskId) {
      try {
        task = await Task.findById(taskId);
      } catch (e) {
        // Task might not exist yet, use provided data
      }
    }

    // Convert taskId to ObjectId if it's a string
    const taskObjectId = mongoose.Types.ObjectId.isValid(taskId) 
      ? (typeof taskId === 'string' ? new mongoose.Types.ObjectId(taskId) : taskId)
      : new mongoose.Types.ObjectId(taskId);

    const interactionData = {
      userId: userId.toString(),
      taskId: taskObjectId,
      taskTitle: taskTitle || task?.title || 'Unknown Task',
      taskDifficulty: taskDifficulty || task?.difficulty || 'medium',
      taskCategory: taskCategory || task?.category || 'general',
      taskSkills: taskSkills.length > 0 ? taskSkills : (task?.skills || []),
      completed: completed,
      score: score !== undefined ? score : null,
      timeSpent: timeSpent || 0,
      viewed: viewed !== undefined ? viewed : true,
      started: started !== undefined ? started : (completed || false),
      abandoned: abandoned || false
    };

    // Update or create interaction
    const interaction = await UserTaskInteraction.findOneAndUpdate(
      { userId: userId.toString(), taskId: taskObjectId },
      {
        ...interactionData,
        $inc: { attempts: 1 },
        $set: {
          ...(viewed && !interactionData.firstViewedAt ? { firstViewedAt: new Date() } : {}),
          ...(started && !interactionData.startedAt ? { startedAt: new Date() } : {}),
          ...(completed && !interactionData.completedAt ? { completedAt: new Date() } : {})
        }
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true
      }
    );

    // Calculate and save weight
    interaction.calculateWeight();
    await interaction.save();

    return {
      success: true,
      interaction: {
        id: interaction._id.toString(),
        weight: interaction.interactionWeight,
        completed: interaction.completed,
        score: interaction.score
      }
    };
  } catch (error) {
    console.error('[trackInteraction] Error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

