const path = require('node:path');
const fs = require('node:fs');
const { execSync } = require('node:child_process');
const dotenv = require('./Backend/node_modules/dotenv');

// Ensure MongoDB connection string is loaded with override
dotenv.config({ path: path.join(__dirname, '.env'), override: true });
dotenv.config({ path: path.join(__dirname, 'Backend', '.env'), override: true });

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

// Ensure frontend assets are built
const distDir = path.join(__dirname, 'Frontend', 'dist');
if (!fs.existsSync(path.join(distDir, 'index.html'))) {
  console.log('[StoneDesk] Building frontend assets...');
  execSync('npm run build', { cwd: path.join(__dirname, 'Frontend'), stdio: 'inherit' });
}

const { connectDB, disconnectDB } = require('./Backend/utils/db');
const backendApp = require('./Backend/app');
const express = require(path.join(__dirname, 'Backend', 'node_modules', 'express'));

// Serve static frontend files
backendApp.use(express.static(distDir, { maxAge: '1h', index: false }));

// SPA fallback for all unhandled client GET routes
backendApp.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/api') && !req.path.startsWith('/uploads')) {
    return res.sendFile(path.join(distDir, 'index.html'));
  }
  next();
});

// Connect to MongoDB Atlas and start server
connectDB().then(() => {
  const server = backendApp.listen(PORT, HOST, () => {
    console.log(`[StoneDesk] Server running with MongoDB Atlas on http://${HOST}:${PORT}`);
  });

  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.once(signal, () => {
      server.close(async () => {
        await disconnectDB();
        process.exit(0);
      });
    });
  }
}).catch(err => {
  console.error('[StoneDesk] MongoDB Atlas startup failed:', err.message);
  process.exit(1);
});
