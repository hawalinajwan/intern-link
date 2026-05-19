const mongoose = require('mongoose');

async function connectMongoDB() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/magang_chat';

  mongoose.set('strictQuery', true);
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 1500 });

  return mongoose.connection;
}

module.exports = { connectMongoDB };
