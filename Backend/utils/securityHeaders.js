const { randomBytes } = require('node:crypto');

function generateNonce() {
  return randomBytes(16).toString('base64');
}

module.exports = (req, res, next) => {
  const nonce = generateNonce();
  res.locals.cspNonce = nonce;

  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'no-referrer',
    'Content-Security-Policy': "frame-ancestors 'none'",
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'
  });
  next();
};

module.exports.generateNonce = generateNonce;
