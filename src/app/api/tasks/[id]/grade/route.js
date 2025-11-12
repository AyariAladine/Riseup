import { getUserFromRequest } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import Task from '@/models/Task';
import Achievement from '@/models/Achievement';
import { trackInteraction } from '@/lib/track-interaction';
import { updateSkillLevel, detectLanguageFromTask } from '@/lib/update-skill-level';
import { determineBadgeLevel } from '@/lib/achievement-utils';
import mongoose from 'mongoose';

/**
 * POST /api/tasks/[id]/grade
 * 
 * Grade a task with conversation history and score.
 * - Saves the grading conversation
 * - Updates task score
 * - Marks task as completed
 * - Triggers NFT badge minting
 * 
 * Request body:
 * {
 *   conversation: [{ role: 'user'|'assistant'|'system', content: string }],
 *   score: number (0-100),
 *   notes?: string
 * }
 */
export async function POST(req, { params }) {
  try {
    const { user } = await getUserFromRequest(req);
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401 }
      );
    }

    await connectToDatabase();
    const { id } = await params;
    const body = await req.json();
    const { conversation, score, notes } = body;

    // Validate input
    if (!conversation || !Array.isArray(conversation)) {
      return new Response(
        JSON.stringify({ error: 'Conversation is required and must be an array' }),
        { status: 400 }
      );
    }

    if (typeof score !== 'number' || score < 0 || score > 100) {
      return new Response(
        JSON.stringify({ error: 'Score must be a number between 0 and 100' }),
        { status: 400 }
      );
    }

    // Find the task
    const task = await Task.findOne({ 
      _id: id, 
      userId: user.id 
    });

    if (!task) {
      return new Response(
        JSON.stringify({ error: 'Task not found' }),
        { status: 404 }
      );
    }

    // Check if task is already graded - prevent duplicate grading
    if (task.status === 'completed' && task.gradedAt) {
      console.log(`[Grade] Task ${id} already graded at ${task.gradedAt}. Skipping duplicate grading.`);
      return new Response(
        JSON.stringify({
          success: true,
          task: {
            _id: task._id,
            title: task.title,
            score: task.score,
            status: task.status,
            completed: task.completed,
            gradedAt: task.gradedAt,
            nftMinted: task.nftMinted
          },
          message: 'Task already graded.',
          alreadyGraded: true
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Add timestamps to conversation messages
    const timestampedConversation = conversation.map(msg => ({
      ...msg,
      timestamp: msg.timestamp || new Date()
    }));

    // Update task with grading data
    task.gradeConversation = timestampedConversation;
    task.score = score;
    task.gradedAt = new Date();
    task.status = 'completed';
    task.completed = true;
    task.completedAt = new Date();
    task.progress = 100;
    
    if (notes) {
      task.notes = notes;
    }

    await task.save();

    console.log(`[Grade] Task ${id} graded with score ${score} by user ${user.id}`);

    // Update skill level based on score
    let skillLevelUpdate = null;
    try {
      skillLevelUpdate = await updateSkillLevel(user._id, score);
      console.log(`[Grade] Skill level updated:`, skillLevelUpdate);
    } catch (skillError) {
      console.error('[Grade] Failed to update skill level:', skillError);
      // Don't fail the whole request if skill level update fails
    }

    // Unlock achievement if score >= 70
    let achievementUnlocked = null;
    if (score >= 70) {
      try {
        const badge = determineBadgeLevel(score);
        if (badge) {
          const language = detectLanguageFromTask(task);
          
          const unlockRes = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/achievements/unlock`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Cookie': req.headers.get('cookie') || ''
            },
            body: JSON.stringify({
              language,
              score: score,
              challengeTitle: task.title,
              testId: task._id.toString()
            })
          });

          if (unlockRes.ok) {
            const unlockData = await unlockRes.json();
            if (unlockData.success) {
              achievementUnlocked = {
                badge,
                language,
                rarity: unlockData.achievement?.rarity,
                message: unlockData.message
              };
              console.log(`[Grade] Achievement unlocked:`, achievementUnlocked);
            }
          }
        }
      } catch (achievementError) {
        console.error('[Grade] Failed to unlock achievement:', achievementError);
        // Don't fail the whole request if achievement unlock fails
      }
    }

    // Track interaction for LightFM learning
    try {
      const timeSpent = task.completedAt && task.startedAt 
        ? Math.round((task.completedAt - task.startedAt) / (1000 * 60)) // minutes
        : task.estimatedTime || 30;
      
      await trackInteraction({
        userId: user._id,
        taskId: task._id.toString(),
        taskTitle: task.title,
        taskDifficulty: task.difficulty || 'medium',
        taskCategory: task.category || 'general',
        taskSkills: task.skills || [],
        completed: true,
        score: score,
        timeSpent: timeSpent,
        started: true,
        viewed: true
      });
    } catch (trackErr) {
      console.warn('[Grade] Interaction tracking error:', trackErr);
    }

    // Trigger NFT minting asynchronously (don't wait for it)
    mintNFTBadge(task._id.toString(), user.id, score, task.title)
      .then(result => {
        console.log(`[Grade] NFT minting initiated for task ${id}:`, result);
      })
      .catch(error => {
        console.error(`[Grade] NFT minting failed for task ${id}:`, error);
      });

    return new Response(
      JSON.stringify({
        success: true,
        task: {
          _id: task._id,
          title: task.title,
          score: task.score,
          status: task.status,
          completed: task.completed,
          gradedAt: task.gradedAt,
          nftMinted: task.nftMinted
        },
        skillLevel: skillLevelUpdate,
        achievement: achievementUnlocked,
        message: 'Task graded successfully! NFT badge will be minted shortly.'
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Grade] Error grading task:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to grade task',
        details: error.message 
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

/**
 * Mint NFT badge for completed task
 * This runs asynchronously after task is graded
 */
async function mintNFTBadge(taskId, userId, score, taskTitle) {
  try {
    // Determine badge tier based on score
    let badgeTier = 'Bronze';
    let badgeRarity = 'Common';
    
    if (score >= 90) {
      badgeTier = 'Diamond';
      badgeRarity = 'Legendary';
    } else if (score >= 75) {
      badgeTier = 'Gold';
      badgeRarity = 'Rare';
    } else if (score >= 60) {
      badgeTier = 'Silver';
      badgeRarity = 'Uncommon';
    }

    // Call the Hedera NFT minting endpoint
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/hedera/mint-nft`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        taskId,
        userId,
        score,
        badgeTier,
        badgeRarity,
        taskTitle
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.warn('[mintNFTBadge] NFT minting failed (will continue without NFT):', errorText);
      // Don't throw - allow task completion even if NFT minting fails
      return { success: false, error: errorText };
    }

    const data = await response.json();
    
    // Update task with NFT information
    await connectToDatabase();
    const updatedTask = await Task.findByIdAndUpdate(taskId, {
      nftBadgeId: data.serialNumber,
      nftTokenId: data.tokenId,
      nftTransactionHash: data.transactionId,
      nftMetadataUri: data.metadataUri,
      nftMinted: true
    }, { new: true });
    
    // Create Achievement record for leaderboard
    try {
      // Detect language from task title/description
      const taskText = `${updatedTask.title} ${updatedTask.description || ''}`.toLowerCase();
      let language = 'Other';
      
      if (/\b(javascript|js|node|react|vue|angular)\b/.test(taskText)) {
        language = 'JavaScript';
      } else if (/\b(typescript|ts)\b/.test(taskText)) {
        language = 'TypeScript';
      } else if (/\b(python|py|django|flask)\b/.test(taskText)) {
        language = 'Python';
      } else if (/\b(java|spring|maven)\b/.test(taskText)) {
        language = 'Java';
      } else if (/\b(c\+\+|cpp)\b/.test(taskText)) {
        language = 'C++';
      } else if (/\b(rust)\b/.test(taskText)) {
        language = 'Rust';
      }
      
      // Create or update achievement
      const userObjectId = new mongoose.Types.ObjectId(userId);
      
      const achievement = await Achievement.findOneAndUpdate(
        { 
          userId: userObjectId, 
          language, 
          badge: badgeTier 
        },
        {
          userId: userObjectId,
          language,
          badge: badgeTier,
          rarity: badgeRarity,
          score,
          nftTokenId: data.tokenId,
          nftContractAddress: 'hedera-testnet',
          transactionHash: data.transactionId,
          metadataUri: data.metadataUri,
          network: 'hedera-testnet',
          chainId: 0, // Hedera doesn't use chainId
          testId: taskId,
          challengeTitle: taskTitle,
          unlockedAt: new Date(),
          minted: true
        },
        { upsert: true, new: true }
      );
      
      console.log(`[mintNFTBadge] Achievement created:`, {
        userId: userId,
        userObjectId: userObjectId.toString(),
        language,
        badge: badgeTier,
        achievementId: achievement._id.toString()
      });
    } catch (achievementError) {
      console.error('[mintNFTBadge] Failed to create achievement:', achievementError);
      // Don't fail the whole operation if achievement creation fails
    }

    return data;
  } catch (error) {
    console.error('[mintNFTBadge] Error:', error);
    throw error;
  }
}
