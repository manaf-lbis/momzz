import crypto from 'node:crypto';
import mongoose from 'mongoose';
import { config } from '../src/config.js';
import { connectDB, PersonalAccessToken, User } from '../src/db/connection.js';

/**
 * CLI utility to issue a scoped Personal Access Token (PAT) for an existing Momzz user.
 * Usage:
 *   npx tsx scripts/generate-pat.ts <mobile> [name] [scopes]
 * Example:
 *   npx tsx scripts/generate-pat.ts 9876543210 "Claude Desktop" "jobs:read,inventory:read,profile:read"
 */
async function main() {
  const args = process.argv.slice(2);
  const mobile = args[0];
  const name = args[1] || 'Default LLM Agent PAT';
  const rawScopes = args[2];

  if (!mobile) {
    console.error('Usage: npx tsx scripts/generate-pat.ts <userMobile> [tokenName] [commaSeparatedScopes]');
    process.exit(1);
  }

  await connectDB();

  const user = await User.findOne({ mobile }).lean();
  if (!user) {
    console.error(`User with mobile ${mobile} not found in database.`);
    process.exit(1);
  }

  // Generate 32 bytes of cryptographically secure random entropy
  const randomSecret = crypto.randomBytes(32).toString('hex');
  const plainToken = `momzz_pat_${randomSecret}`;

  // Compute one-way SHA-256 hash
  const tokenHash = crypto.createHash('sha256').update(plainToken).digest('hex');
  const prefix = plainToken.substring(0, 16);

  // Scopes assignment: If Admin, allow admin scopes; if Worker, restrict to operational scopes
  let scopes: string[];
  if (rawScopes) {
    scopes = rawScopes.split(',').map((s) => s.trim());
  } else if (user.role === 'ADMIN') {
    scopes = ['*'];
  } else {
    scopes = ['profile:read', 'profile:write', 'jobs:read', 'inventory:read'];
  }

  // 90 days expiration by default
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 90);

  const patDoc = await PersonalAccessToken.create({
    userId: user._id,
    name,
    tokenHash,
    prefix,
    scopes,
    expiresAt,
  });

  console.log('================================================================');
  console.log('Personal Access Token (PAT) Successfully Issued!');
  console.log('================================================================');
  console.log(`User:         ${user.name} (${user.mobile})`);
  console.log(`Role:         ${user.role}`);
  console.log(`Token Name:   ${name}`);
  console.log(`PAT ID:       ${patDoc._id}`);
  console.log(`Scopes:       ${scopes.join(', ')}`);
  console.log(`Expires At:   ${expiresAt.toISOString()}`);
  console.log('----------------------------------------------------------------');
  console.log('SECRET TOKEN (Store this safely - will NEVER be shown again):');
  console.log(`\n  ${plainToken}\n`);
  console.log('SHA-256 Hash stored in DB:');
  console.log(`  ${tokenHash}`);
  console.log('================================================================');

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('[PAT GENERATION ERROR]', err);
  process.exit(1);
});
