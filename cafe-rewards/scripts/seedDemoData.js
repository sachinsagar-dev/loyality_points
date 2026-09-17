require('dotenv').config();

const crypto = require('crypto');
const connectDatabase = require('../config/db');
const Member = require('../models/Member');
const User = require('../models/User');
const { hashPassword } = require('../services/authService');

const staff = [
  { name: 'Maya Chen', email: 'maya.chen@cafe-rewards.demo' },
  { name: 'Jordan Brooks', email: 'jordan.brooks@cafe-rewards.demo' },
  { name: 'Priya Shah', email: 'priya.shah@cafe-rewards.demo' },
];

const customerNames = [
  'Ava Patel', 'Liam Carter', 'Noah Williams', 'Emma Johnson', 'Oliver Brown',
  'Sophia Davis', 'Ethan Miller', 'Isabella Wilson', 'Mateo Moore', 'Mia Taylor',
  'Lucas Anderson', 'Amelia Thomas', 'Henry Jackson', 'Harper White', 'Leo Harris',
  'Evelyn Martin', 'James Thompson', 'Luna Garcia', 'Benjamin Martinez', 'Ella Robinson',
  'William Clark', 'Sofia Rodriguez', 'Michael Lewis', 'Camila Lee', 'Alexander Walker',
  'Charlotte Hall', 'Daniel Allen', 'Aria Young', 'Sebastian King', 'Nora Wright',
];

const tiers = ['Regular', 'Regular', 'Silver', 'Silver', 'Gold'];

function createPassword() {
  return `Cafe-${crypto.randomBytes(6).toString('base64url')}`;
}

async function seedStaff() {
  const credentials = [];
  for (const account of staff) {
    const existing = await User.findOne({ email: account.email });
    if (existing) {
      credentials.push({ ...account, password: '(existing account; unchanged)' });
      continue;
    }
    const password = createPassword();
    await User.create({ ...account, passwordHash: await hashPassword(password) });
    credentials.push({ ...account, password });
  }
  return credentials;
}

async function seedMembers() {
  let created = 0;
  for (let index = 0; index < customerNames.length; index += 1) {
    const phone = `202555${String(101 + index).padStart(4, '0')}`;
    const existing = await Member.exists({ phone });
    if (existing) continue;
    await Member.create({
      name: customerNames[index],
      phone,
      tier: tiers[index % tiers.length],
      points: [0, 12, 24, 38, 55][index % 5],
    });
    created += 1;
  }
  return created;
}

async function main() {
  await connectDatabase();
  const credentials = await seedStaff();
  const createdMembers = await seedMembers();
  console.log(`Created or preserved ${staff.length} staff accounts.`);
  console.log(`Created ${createdMembers} new customer accounts; total demo customers: ${customerNames.length}.`);
  console.log('\nStaff login credentials:');
  credentials.forEach((account) => console.log(`${account.email} | ${account.password}`));
  await require('mongoose').disconnect();
}

main().catch(async (error) => {
  console.error('Unable to seed demo data:', error.message);
  await require('mongoose').disconnect();
  process.exit(1);
});