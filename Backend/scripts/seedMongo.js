const { connectDB, disconnectDB } = require('../utils/db');
const models = require('../models');
const fs = require('node:fs');
const path = require('node:path');
const { randomBytes, scrypt } = require('node:crypto');
const { promisify } = require('node:util');
const derive = promisify(scrypt);

async function passwordHash(password, salt) {
  return (await derive(password, salt, 64, { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 })).toString('hex');
}

async function seed() {
  await connectDB();
  console.log('[Seed] Checking if database is already seeded...');

  const settingsCount = await models.MasterSettings.countDocuments();
  if (settingsCount > 0) {
    console.log('[Seed] Database already has data. Skipping seed.');
    await disconnectDB();
    return;
  }

  const mockFile = path.join(__dirname, '../mock/mock-data.json');
  let mockData;
  try {
    mockData = JSON.parse(fs.readFileSync(mockFile, 'utf8'));
  } catch (err) {
    console.error('[Seed] Could not read mock-data.json:', err.message);
    await disconnectDB();
    return;
  }

  console.log('[Seed] Seeding initial data from mock data into MongoDB Atlas...');

  // 1. Create Organization / MasterSettings
  const org = await models.MasterSettings.create({
    _id: mockData.settings.id || '96e271da-0000-4000-8000-000000000001',
    organizationId: mockData.settings.organizationId || 'ORIGINAL-STONE',
    businessName: mockData.settings.businessName,
    address: mockData.settings.address,
    phone: mockData.settings.phone,
    bankDetails: mockData.settings.bankDetails || '',
    gstNumber: mockData.settings.gstNumber || '',
    tradeLicense: mockData.settings.tradeLicense || '',
    defaultRoyaltyFee: mockData.settings.defaultRoyaltyFee || 2500,
    savedTrucks: mockData.settings.savedTrucks || [],
    savedDestinations: mockData.settings.savedDestinations || [],
    stoneRates: mockData.settings.stoneRates || [],
    version: 1
  });
  console.log(`[Seed] Created MasterSettings: ${org.businessName} (${org.id})`);

  // 2. Create Users
  const salt = randomBytes(16).toString('hex');
  const hash = await passwordHash('StoneDesk@2026', salt);

  for (const u of mockData.users || []) {
    await models.User.create({
      _id: u.id,
      organizationId: org._id,
      name: u.name,
      email: u.email,
      role: u.role === 'Yard Manager' ? 'YardManager' : u.role,
      active: u.active ?? true,
      passwordHash: hash,
      passwordSalt: salt,
      passwordLogin: true
    });
    console.log(`[Seed] Created User: ${u.email} (Password: StoneDesk@2026)`);
  }

  // 3. Create Dispatches
  for (const d of mockData.dispatches || []) {
    await models.Dispatch.create({
      _id: d.id,
      organizationId: org._id,
      dispatchSlipNumber: d.dispatchSlipNumber,
      date: new Date(d.date || Date.now()),
      supervisor: d.supervisor,
      partyName: d.partyName,
      clientRequestId: d.clientRequestId,
      logistics: d.logistics,
      inventory: d.inventory,
      summary: d.summary,
      status: d.status || 'Draft'
    });
    console.log(`[Seed] Created Dispatch: ${d.dispatchSlipNumber}`);
  }

  console.log('[Seed] Database successfully seeded!');
  await disconnectDB();
}

seed().catch(err => {
  console.error('[Seed Error]:', err);
  process.exit(1);
});
