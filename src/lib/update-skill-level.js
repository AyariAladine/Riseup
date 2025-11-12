import { connectToDatabase } from '@/lib/mongodb';
import UserLearningProfile from '@/models/UserLearningProfile';

/**
 * Update user skill level based on score
 * @param {string|ObjectId} userId - User ID
 * @param {number} score - Score percentage (0-100)
 * @returns {Promise<{old: number, new: number, change: number, message: string}>}
 */
export async function updateSkillLevel(userId, score) {
  await connectToDatabase();

  const profile = await UserLearningProfile.findOne({
    $or: [
      { userId: userId },
      { userId: userId.toString() }
    ]
  });

  if (!profile) {
    throw new Error('User learning profile not found');
  }

  const oldSkillLevel = profile.skillLevel;
  let newSkillLevel = oldSkillLevel;
  let skillLevelChange = 0;

  if (score >= 90) {
    // Excellent: level up by 1 (max 10)
    newSkillLevel = Math.min(10, oldSkillLevel + 1);
    skillLevelChange = 1;
  } else if (score >= 80) {
    // Good: level up by 0.5 (rounded)
    newSkillLevel = Math.min(10, Math.round((oldSkillLevel + 0.5) * 2) / 2);
    skillLevelChange = 0.5;
  } else if (score >= 70) {
    // Pass: no change
    skillLevelChange = 0;
  } else if (score >= 60) {
    // Below pass: level down by 0.5 (min 1)
    newSkillLevel = Math.max(1, Math.round((oldSkillLevel - 0.5) * 2) / 2);
    skillLevelChange = -0.5;
  } else {
    // Poor: level down by 1 (min 1)
    newSkillLevel = Math.max(1, oldSkillLevel - 1);
    skillLevelChange = -1;
  }

  // Update skill level directly using findOneAndUpdate to bypass pre-save hook
  // The pre-save hook recalculates based on experience/projects, but we want to update based on performance
  await UserLearningProfile.findOneAndUpdate(
    {
      $or: [
        { userId: userId },
        { userId: userId.toString() }
      ]
    },
    { 
      skillLevel: newSkillLevel,
      updatedAt: new Date()
    },
    { new: true }
  );

  return {
    old: oldSkillLevel,
    new: newSkillLevel,
    change: skillLevelChange,
    message: skillLevelChange > 0 
      ? `🎉 Level up! Your skill level increased from ${oldSkillLevel} to ${newSkillLevel}!`
      : skillLevelChange < 0
      ? `📉 Your skill level decreased from ${oldSkillLevel} to ${newSkillLevel}. Keep practicing!`
      : `Your skill level remains at ${oldSkillLevel}.`
  };
}

/**
 * Detect language from task context
 * @param {Object|string} taskContext - Task object or JSON string
 * @returns {string} Detected language
 */
export function detectLanguageFromTask(taskContext) {
  let task = taskContext;
  if (typeof taskContext === 'string') {
    try {
      task = JSON.parse(taskContext);
    } catch (e) {
      return 'JavaScript'; // Default
    }
  }

  const taskText = `${task.title || ''} ${task.description || ''}`.toLowerCase();
  
  if (/\b(javascript|js|node|react|vue|angular|typescript|ts)\b/.test(taskText)) {
    return 'JavaScript';
  } else if (/\b(python|py|django|flask|pandas)\b/.test(taskText)) {
    return 'Python';
  } else if (/\b(java|spring|maven)\b/.test(taskText)) {
    return 'Java';
  } else if (/\b(c\+\+|cpp|c)\b/.test(taskText)) {
    return 'C++';
  } else if (/\b(php|laravel)\b/.test(taskText)) {
    return 'PHP';
  } else if (/\b(ruby|rails)\b/.test(taskText)) {
    return 'Ruby';
  } else if (/\b(go|golang)\b/.test(taskText)) {
    return 'Go';
  } else if (/\b(rust)\b/.test(taskText)) {
    return 'Rust';
  }
  
  return 'JavaScript'; // Default
}

