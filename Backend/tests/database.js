const { connectDB } = require('../utils/db');
const prisma = require('../utils/prisma');

async function setup(t) {
  await connectDB();
  // Guard: Never drop or modify non-test databases
  if (process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('_test')) {
    return;
  }
}

module.exports = {
  prisma,
  setup
};
