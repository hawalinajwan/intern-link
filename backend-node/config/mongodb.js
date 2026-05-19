const mongoose = require('mongoose');

async function connectMongoDB() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error('MONGODB_URI is required.');
  }

  mongoose.set('strictQuery', true);
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 1500 });

  return mongoose.connection;
}

module.exports = { connectMongoDB };
