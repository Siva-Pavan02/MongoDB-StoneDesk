// Read-only MongoDB connectivity check. Never prints passwords or connection strings.
const { connectDB, disconnectDB } = require('../utils/db');

(async () => {
  try {
    const conn = await connectDB();
    console.log(`DATABASE_URL: connected to MongoDB (${conn.host}/${conn.name})`);
    await disconnectDB();
  } catch (error) {
    console.error('DATABASE_URL: MongoDB connection failed:', error.message);
    process.exitCode = 1;
  }
})();
