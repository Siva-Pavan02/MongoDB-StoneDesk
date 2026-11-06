function authFlags(user) {
  return {
    hasGoogle: false,
    hasPassword: true
  };
}

function requiresCurrentPassword(user) {
  return true;
}

// Hash routing: the token never reaches a server log or Referer header.
function buildResetUrl(appOrigin, token, email) {
  return `${String(appOrigin).replace(/\/+$/, '')}/#reset-password?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`;
}

module.exports = { authFlags, requiresCurrentPassword, buildResetUrl };
