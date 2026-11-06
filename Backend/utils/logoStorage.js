const path = require('node:path');
const fs = require('node:fs/promises');

const uploadDir = path.resolve(process.env.UPLOAD_DIR || path.join(__dirname, '../uploads'));

function valid(filename) {
  if (!/^[a-f0-9-]+\.png$/.test(filename)) throw new Error('Invalid logo filename');
}

function storageFailure() {
  return Object.assign(new Error('Logo storage is temporarily unavailable. Please retry.'), { status: 503, safeAuthError: true });
}

async function saveLogo(filename, buffer) {
  valid(filename);
  await fs.mkdir(uploadDir, { recursive: true });
  await fs.writeFile(path.join(uploadDir, filename), buffer);
}

async function readLogo(filename) {
  valid(filename);
  return fs.readFile(path.join(uploadDir, filename));
}

const ORGANIZATION_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const SHA256 = /^[a-f0-9]{64}$/;

function contentLogoKey(organizationId, sha256) {
  if (typeof organizationId !== 'string' || !ORGANIZATION_ID.test(organizationId) || typeof sha256 !== 'string' || !SHA256.test(sha256)) {
    throw new Error('Invalid logo path');
  }
  return `org/${organizationId}/${sha256}.png`;
}

const logoNotFound = () => Object.assign(new Error('Logo not found'), { status: 404 });

async function saveContentLogo(organizationId, sha256, buffer) {
  const key = contentLogoKey(organizationId, sha256);
  const file = path.join(uploadDir, ...key.split('/'));
  await fs.mkdir(path.dirname(file), { recursive: true });
  try {
    await fs.writeFile(file, buffer, { flag: 'wx' });
  } catch (error) {
    if (error.code === 'EEXIST') return 'exists';
    throw error;
  }
  return 'created';
}

async function readContentLogo(organizationId, sha256) {
  const key = contentLogoKey(organizationId, sha256);
  try {
    return await fs.readFile(path.join(uploadDir, ...key.split('/')));
  } catch (error) {
    if (error.code === 'ENOENT') throw logoNotFound();
    throw error;
  }
}

module.exports = {
  uploadDir,
  saveLogo,
  readLogo,
  storageFailure,
  contentLogoKey,
  saveContentLogo,
  readContentLogo
};
