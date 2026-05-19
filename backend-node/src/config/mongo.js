const { connectMongoDB } = require('../../config/mongodb');

async function connectMongo() {
  try {
    await connectMongoDB();
    return true;
  } catch (error) {
    console.warn(`MongoDB unavailable, using in-memory chat store: ${error.message}`);
    return false;
  }
}

module.exports = { connectMongo };
