import mongoose from 'mongoose';

const achievementSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  language: { type: String, required: true }, // Python, JavaScript, TypeScript, etc.
  badge: { type: String, enum: ['Bronze', 'Silver', 'Gold', 'Diamond'], required: true },
  rarity: { type: String, enum: ['Common', 'Uncommon', 'Rare', 'Legendary'], required: true },
  score: { type: Number, required: true, min: 0, max: 100 },
  
  // NFT metadata
  nftTokenId: { type: String, default: null }, // On-chain token ID
  nftContractAddress: { type: String, default: null },
  transactionHash: { type: String, default: null },
  metadataUri: { type: String, default: null }, // IPFS URI
  
  // Blockchain network
  network: { type: String, enum: ['polygon-mumbai', 'sepolia'], default: 'polygon-mumbai' },
  chainId: { type: Number, default: 80001 }, // Polygon Mumbai
  
  // Achievement data
  testId: { type: String, default: null },
  challengeTitle: { type: String, default: null },
  unlockedAt: { type: Date, default: Date.now, index: true },
  
  // Status tracking
  minted: { type: Boolean, default: false },
  mintingError: { type: String, default: null },
}, { timestamps: true });

// Compound index for user + language + badge to prevent duplicates
achievementSchema.index({ userId: 1, language: 1, badge: 1 }, { unique: true });

const Achievement = mongoose.models.Achievement || mongoose.model('Achievement', achievementSchema);
export default Achievement;
