import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDirectory = path.resolve(__dirname, '../data');
const databasePath = path.join(dataDirectory, 'deplug-social.db');

fs.mkdirSync(dataDirectory, { recursive: true });

export const db = new Database(databasePath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    username TEXT NOT NULL UNIQUE COLLATE NOCASE,
    email TEXT NOT NULL UNIQUE COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'buyer' CHECK(role IN ('buyer', 'admin')),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS listings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    platform TEXT NOT NULL,
    title TEXT NOT NULL,
    handle TEXT NOT NULL,
    category TEXT NOT NULL,
    followers TEXT NOT NULL,
    engagement TEXT NOT NULL,
    account_age TEXT NOT NULL,
    audience TEXT NOT NULL DEFAULT 'Global',
    price_cents INTEGER NOT NULL CHECK(price_cents > 0),
    description TEXT NOT NULL,
    verified INTEGER NOT NULL DEFAULT 0 CHECK(verified IN (0, 1)),
    status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'published', 'archived')),
    created_by INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(created_by) REFERENCES users(id)
  );
`);

export function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    username: user.username,
    email: user.email,
    role: user.role,
    createdAt: user.created_at,
  };
}

export function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function createSession(userId) {
  const token = crypto.randomBytes(48).toString('base64url');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  db.prepare('INSERT INTO sessions (user_id, token_hash, expires_at) VALUES (?, ?, ?)').run(userId, hashToken(token), expiresAt);
  return { token, expiresAt };
}

export function publicListing(listing) {
  return {
    id: listing.id,
    platform: listing.platform,
    title: listing.title,
    handle: listing.handle,
    category: listing.category,
    followers: listing.followers,
    engagement: listing.engagement,
    age: listing.account_age,
    audience: listing.audience,
    price: listing.price_cents / 100,
    description: listing.description,
    verified: Boolean(listing.verified),
    status: listing.status,
    createdAt: listing.created_at,
    updatedAt: listing.updated_at,
  };
}

export async function seedDevelopmentUsers() {
  const users = [
    { name: 'Deplug Admin', username: 'admin', email: 'admin@deplugsocial.test', password: 'AdminTest123!', role: 'admin' },
    { name: 'Test Buyer', username: 'buyer', email: 'buyer@deplugsocial.test', password: 'BuyerTest123!', role: 'buyer' },
  ];

  for (const user of users) {
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(user.email);
    if (!existing) {
      const passwordHash = await bcrypt.hash(user.password, 12);
      db.prepare('INSERT INTO users (name, username, email, password_hash, role) VALUES (?, ?, ?, ?, ?)')
        .run(user.name, user.username, user.email, passwordHash, user.role);
    }
  }

  const listingCount = db.prepare('SELECT COUNT(*) AS count FROM listings').get().count;
  if (listingCount === 0) {
    const admin = db.prepare('SELECT id FROM users WHERE email = ?').get('admin@deplugsocial.test');
    const seedListings = [
      ['Instagram', 'Lifestyle creator account', '@marie.journal', 'Lifestyle', '42.8K', '5.7%', '3 years', 'Global', 14900, 'Sample listing used for development and UI testing.', 1, 'published'],
      ['TikTok', 'Entertainment account', '@dailyvibess', 'Entertainment', '118K', '8.2%', '2 years', 'Global', 22900, 'Sample listing used for development and UI testing.', 1, 'published'],
      ['Facebook', 'US business page', 'Local Market Daily', 'Business', '27.4K', '4.9%', '5 years', 'US', 11900, 'Sample listing used for development and UI testing.', 1, 'published'],
      ['Twitter/X', 'Tech community account', '@buildnotes', 'Technology', '18.6K', '6.4%', '4 years', 'Global', 9500, 'Sample listing used for development and UI testing.', 0, 'draft'],
    ];
    const insert = db.prepare(`INSERT INTO listings (platform, title, handle, category, followers, engagement, account_age, audience, price_cents, description, verified, status, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    const createSeeds = db.transaction(() => seedListings.forEach((listing) => insert.run(...listing, admin.id)));
    createSeeds();
  }
}
