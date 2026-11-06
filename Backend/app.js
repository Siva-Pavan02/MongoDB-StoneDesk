const express = require('express');
const cors = require('cors');
require('dotenv').config({ path: require('node:path').join(__dirname, '.env') });

const masterSettingsRoutes = require('./routes/masterSettingsRoutes');
const dispatchRoutes = require('./routes/dispatchRoutes');
const loadingListRoutes = require('./routes/loadingListRoutes');
const auth = require('./utils/auth');

const app = express();
const isProduction = process.env.NODE_ENV === 'production';

app.disable('x-powered-by');
if (process.env.TRUST_PROXY === '1') app.set('trust proxy', 1);
app.use(require('./utils/securityHeaders'));


if (isProduction) {
  if (!process.env.APP_ORIGIN) throw new Error('APP_ORIGIN must be set in production');
}

// Reject untrusted origins before preflight handling; allowed OPTIONS requests
// end in cors(), before any session or role middleware runs.
app.use((req, res, next) => {
  if (req.headers.origin && !auth.allowedOrigin(req.headers.origin, req)) return res.status(403).json({ error: 'Origin not allowed' });
  next();
});
app.use(cors({ origin: true, credentials: true, maxAge: 600 }));

app.use(express.json({ limit: '100kb' }));

const apiRouter = express.Router();
apiRouter.use((req, res, next) => {
  if (req.is('application/json') && (req.body === null || Array.isArray(req.body) || (req.body !== undefined && typeof req.body !== 'object'))) return res.status(400).json({ error: 'Expected a JSON object' });
  if (req.body === undefined) req.body = {};
  next();
});
apiRouter.use((req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
apiRouter.use('/auth', require('./routes/authRoutes'));
apiRouter.use('/master-settings/:quarryId', auth.requireSession, auth.requireActive, masterSettingsRoutes);
apiRouter.use('/dispatches', auth.requireSession, auth.requireActive, dispatchRoutes);
apiRouter.use('/loading-lists', auth.requireSession, auth.requireActive, loadingListRoutes);

app.use('/api', apiRouter);

// Content-addressed logos (historical and current) for the session's organization.
// Other methods and deeper paths fall through to the current-logo route below (404).
app.get('/uploads/logos/:file', auth.requireSession, auth.requireActive, require('./utils/serveContentLogo'));
app.use('/uploads', auth.requireSession, auth.requireActive, require('./utils/requireOrganizationLogo'), express.static(require('./utils/businessBranding').uploadDir, {
  maxAge: 0, setHeaders: res => { res.setHeader('X-Content-Type-Options', 'nosniff'); res.setHeader('Cache-Control', 'private, no-store'); }
}));

app.get(['/healthz', '/api/healthz'], (req, res) => res.json({ ok: true }));
const path = require('node:path');
const fs = require('node:fs');
const distDirectory = path.join(__dirname, '../Frontend/dist');

if (fs.existsSync(distDirectory)) {
  let headers = {};
  try {
    headers = JSON.parse(fs.readFileSync(path.join(distDirectory, 'security-headers.json'), 'utf8'));
  } catch (_) {}
  app.use((req, res, next) => {
    if (Object.keys(headers).length) res.set(headers);
    next();
  });
  app.use(express.static(distDirectory, { index: false }));
  app.get('/{*page}', (req, res) => {
    res.set('Cache-Control', 'no-cache');
    res.sendFile(path.join(distDirectory, 'index.html'));
  });
} else {
  app.get('/', (req, res) => res.send('StoneDesk Server Running'));
}

app.use(require('./utils/errorHandler'));

module.exports = app;
