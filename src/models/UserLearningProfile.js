import mongoose from 'mongoose';

const UserLearningProfileSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  
  // Demographics
  age: {
    type: Number,
    required: true
  },
  
  // Coding Experience
  yearsOfCoding: {
    type: Number,
    required: true
  },
  codingExperience: {
    type: String,
    enum: ['new', 'intermediate', 'expert'],
    required: true
  },
  projectsCompleted: {
    type: Number,
    default: 0
  },
  
  // Learning Goals
  willingToLearn: {
    type: String,
    enum: ['very_willing', 'somewhat_willing', 'not_willing'],
    required: true
  },
  languagesToLearn: {
    type: [String],
    default: []
  },
  primaryLanguageInterest: {
    type: String,
    default: ''
  },
  
  // Activity & Commitment
  activityLevel: {
    type: String,
    enum: ['very_active', 'active', 'somewhat_active', 'inactive'],
    required: true
  },
  hoursPerWeek: {
    type: Number,
    required: true
  },
  commitmentLevel: {
    type: String,
    enum: ['very_committed', 'committed', 'somewhat_committed', 'exploring'],
    required: true
  },
  
  // Computed Fields
  skillLevel: {
    type: Number,
    min: 1,
    max: 10,
    default: 1
  },
  motivation: {
    type: String,
    enum: ['high', 'medium', 'low'],
    default: 'medium'
  },
  
  // Metadata
  completedAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Compute skill level based on experience and projects
UserLearningProfileSchema.pre('save', function(next) {
  // Calculate skill level (1-10)
  let skillLevel = 1;
  
  if (this.codingExperience === 'new') {
    skillLevel = 1 + Math.min(this.projectsCompleted, 3);
  } else if (this.codingExperience === 'intermediate') {
    skillLevel = 4 + Math.min(Math.floor(this.projectsCompleted / 3), 3);
  } else { // expert
    skillLevel = 7 + Math.min(Math.floor(this.projectsCompleted / 5), 3);
  }
  
  this.skillLevel = Math.min(skillLevel, 10);
  
  // Calculate motivation based on willingness and commitment
  if (this.willingToLearn === 'very_willing' && this.commitmentLevel === 'very_committed') {
    this.motivation = 'high';
  } else if (this.willingToLearn === 'not_willing' || this.commitmentLevel === 'exploring') {
    this.motivation = 'low';
  } else {
    this.motivation = 'medium';
  }
  
  this.updatedAt = Date.now();
  next();
});

export default mongoose.models.UserLearningProfile || mongoose.model('UserLearningProfile', UserLearningProfileSchema);
