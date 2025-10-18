import mongoose from 'mongoose';

// Use a global to preserve the connection across HMR in development
const globalWithMongoose = globalThis;
if (!globalWithMongoose._mongoose) {
  globalWithMongoose._mongoose = { conn: null, promise: null };
}

export async function connectToDatabase() {
  const MONGODB_URI = process.env.MONGODB_URI;
  if (!MONGODB_URI) throw new Error('MONGODB_URI missing in .env');

  if (globalWithMongoose._mongoose.conn) return globalWithMongoose._mongoose.conn;
  if (!globalWithMongoose._mongoose.promise) {
    globalWithMongoose._mongoose.promise = mongoose
      .connect(MONGODB_URI, { bufferCommands: false })
      .then((m) => m.connection);
  }
  globalWithMongoose._mongoose.conn = await globalWithMongoose._mongoose.promise;
  return globalWithMongoose._mongoose.conn;
}
