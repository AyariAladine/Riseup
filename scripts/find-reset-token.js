// Usage: node scripts/find-reset-token.js <token>
const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/riseup';
const tokenToFind = process.argv[2];

if (!tokenToFind) {
  console.error('Usage: node scripts/find-reset-token.js <token>');
  process.exit(1);
}

(async () => {
  const client = await MongoClient.connect(uri);
  const db = client.db();
  const collections = await db.listCollections().toArray();
  let found = false;
  for (const { name } of collections) {
    const docs = await db.collection(name).find({ $or: [
      { token: tokenToFind },
      { resetToken: tokenToFind },
      { value: tokenToFind },
      { _id: tokenToFind }
    ] }).toArray();
    if (docs.length > 0) {
      found = true;
      console.log(`Found in collection '${name}':`, docs);
    }
  }
  if (!found) {
    console.log('Token not found in any collection.');
  }
  await client.close();
})();
