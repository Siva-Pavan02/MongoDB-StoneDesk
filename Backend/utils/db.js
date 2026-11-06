const path = require('node:path');
const dns = require('node:dns');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../../.env'), override: true });
dotenv.config({ path: path.resolve(__dirname, '../.env'), override: true });

let isConnected = false;

function getMongoUri(providedUri) {
  let uri = providedUri || process.env.DATABASE_URL || 'mongodb://127.0.0.1:27017/stonedesk';
  uri = uri.trim().replace(/^['"]|['"]$/g, '');
  if (uri.endsWith('/')) {
    uri = uri + 'stonedesk?retryWrites=true&w=majority';
  } else if (!uri.includes('?') && !uri.split('/').pop().includes('?')) {
    if (!uri.includes('/', uri.indexOf('//') + 2)) {
      uri = uri + '/stonedesk?retryWrites=true&w=majority';
    }
  }
  return uri;
}

async function connectDB(customUri) {
  if (isConnected && mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  const mongoUri = getMongoUri(customUri);

  try {
    const conn = await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 10000,
      autoIndex: process.env.NODE_ENV !== 'production'
    });
    isConnected = true;
    console.log(`[MongoDB] Connected successfully to host: ${conn.connection.host}, database: ${conn.connection.name}`);
    return conn.connection;
  } catch (err) {
    if (err.message.includes('querySrv') || err.code === 'ECONNREFUSED') {
      try {
        dns.setServers(['8.8.8.8', '1.1.1.1']);
        const conn = await mongoose.connect(mongoUri, {
          serverSelectionTimeoutMS: 10000,
          autoIndex: process.env.NODE_ENV !== 'production'
        });
        isConnected = true;
        console.log(`[MongoDB] Connected successfully via DNS fallback to host: ${conn.connection.host}, database: ${conn.connection.name}`);
        return conn.connection;
      } catch (fallbackErr) {
        console.error('[MongoDB] Connection error with DNS fallback:', fallbackErr.message);
        throw fallbackErr;
      }
    }
    console.error('[MongoDB] Connection error:', err.message);
    throw err;
  }
}

async function disconnectDB() {
  if (isConnected) {
    await mongoose.disconnect();
    isConnected = false;
    console.log('[MongoDB] Disconnected');
  }
}

module.exports = { connectDB, disconnectDB, mongoose, getMongoUri };
