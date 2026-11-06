const app = require('./app');
const { connectDB, disconnectDB } = require('./utils/db');

const PORT = process.env.PORT || 5000;
const host = process.env.HOST || (process.env.NODE_ENV === 'production' ? '0.0.0.0' : '127.0.0.1');

connectDB().then(() => {
  const server = app.listen(PORT, host, () => console.log(`Server running on port ${PORT}`));
  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.once(signal, () => server.close(async () => {
      await disconnectDB();
      process.exit(0);
    }));
  }
}).catch(async err => {
  console.error('Database startup failed:', err.message);
  await disconnectDB();
  process.exitCode = 1;
});
