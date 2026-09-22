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
`);

export function ensureDatabaseSchema() {
  const tableSql = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='listings'").get()?.sql || '';

  if (!tableSql) {
    db.exec(`
      CREATE TABLE listings (
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
        status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'published', 'payment_pending', 'archived', 'sold')),
        login_credential TEXT DEFAULT '',
        password_credential TEXT DEFAULT '',
        recovery_email TEXT DEFAULT '',
        transfer_notes TEXT DEFAULT '',
        created_by INTEGER NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(created_by) REFERENCES users(id)
      );
    `);
  } else if (!tableSql.includes("'payment_pending'") || !tableSql.includes('login_credential')) {
    db.pragma('foreign_keys = OFF');
    db.transaction(() => {
      db.exec(`
        CREATE TABLE listings_new (
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
          status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'published', 'payment_pending', 'archived', 'sold')),
          login_credential TEXT DEFAULT '',
          password_credential TEXT DEFAULT '',
          recovery_email TEXT DEFAULT '',
          transfer_notes TEXT DEFAULT '',
          created_by INTEGER NOT NULL,
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY(created_by) REFERENCES users(id)
        );
        INSERT INTO listings_new (id, platform, title, handle, category, followers, engagement, account_age, audience, price_cents, description, verified, status, login_credential, password_credential, recovery_email, transfer_notes, created_by, created_at, updated_at)
        SELECT id, platform, title, handle, category, followers, engagement, account_age, audience, price_cents, description, verified, status, login_credential, password_credential, recovery_email, transfer_notes, created_by, created_at, updated_at FROM listings;
        DROP TABLE listings;
        ALTER TABLE listings_new RENAME TO listings;
      `);
    })();
    db.pragma('foreign_keys = ON');
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_reference TEXT NOT NULL UNIQUE,
      user_id INTEGER,
      listing_id INTEGER NOT NULL,
      amount_cents INTEGER NOT NULL,
      currency TEXT NOT NULL DEFAULT 'USD',
      contact_name TEXT NOT NULL,
      contact_email TEXT NOT NULL,
      payment_method TEXT NOT NULL DEFAULT 'card',
      payment_status TEXT NOT NULL DEFAULT 'completed' CHECK(payment_status IN ('pending', 'completed', 'failed')),
      delivery_status TEXT NOT NULL DEFAULT 'delivered' CHECK(delivery_status IN ('processing', 'delivered', 'cancelled')),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE SET NULL,
      FOREIGN KEY(listing_id) REFERENCES listings(id)
    );
  `);

  const orderColumns = db.prepare("PRAGMA table_info(orders)").all().map((column) => column.name);
  if (!orderColumns.includes('paystack_reference')) db.exec('ALTER TABLE orders ADD COLUMN paystack_reference TEXT');
  if (!orderColumns.includes('paystack_transaction_id')) db.exec('ALTER TABLE orders ADD COLUMN paystack_transaction_id TEXT');
  if (!orderColumns.includes('paid_at')) db.exec('ALTER TABLE orders ADD COLUMN paid_at TEXT');
  db.exec('CREATE UNIQUE INDEX IF NOT EXISTS orders_paystack_reference_unique ON orders(paystack_reference) WHERE paystack_reference IS NOT NULL');
}

// Run schema check immediately
ensureDatabaseSchema();

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

export function publicOrder(order) {
  const statusStr = (order.delivery_status || 'delivered').toLowerCase();
  const displayStatus = statusStr === 'delivered' ? 'Delivered' : statusStr === 'processing' ? 'Processing' : 'Cancelled';
  const isDelivered = statusStr === 'delivered' && order.payment_status === 'completed';

  return {
    id: order.order_reference,
    orderId: order.id,
    accountId: order.listing_id,
    platform: order.platform,
    title: order.title,
    handle: order.handle,
    category: order.category,
    followers: order.followers,
    engagement: order.engagement,
    total: (order.amount_cents || 0) / 100,
    contactName: order.contact_name,
    contactEmail: order.contact_email,
    paymentMethod: order.payment_method,
    paymentStatus: order.payment_status,
    paystackReference: order.paystack_reference || null,
    status: displayStatus,
    date: new Date(order.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    createdAt: order.created_at,
    credentials: isDelivered ? {
      login: order.login_credential || '',
      password: order.password_credential || '',
      recoveryEmail: order.recovery_email || '',
      transferNotes: order.transfer_notes || '',
    } : null,
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

  const admin = db.prepare('SELECT id FROM users WHERE email = ?').get('admin@deplugsocial.test');
  const buyer = db.prepare('SELECT id FROM users WHERE email = ?').get('buyer@deplugsocial.test');

  const catalog = [
    {
      id: 1,
      platform: 'Instagram',
      title: 'Lifestyle creator account',
      handle: '@marie.journal',
      category: 'Lifestyle',
      followers: '42.8K',
      engagement: '5.7%',
      account_age: '3 years',
      audience: 'Global',
      price_cents: 14900,
      description: 'Established lifestyle creator account with high US/EU audience engagement.',
      verified: 1,
      status: 'sold',
      login: 'marie.journal.media@gmail.com',
      password: 'MarieVibe2026!',
      recovery: 'recovery-marie@deplugsocial.test',
      notes: '2FA backup code: 492-019. Primary email login provided. Update recovery phone on login.',
    },
    {
      id: 2,
      platform: 'TikTok',
      title: 'Entertainment account',
      handle: '@dailyvibess',
      category: 'Entertainment',
      followers: '118K',
      engagement: '8.2%',
      account_age: '2 years',
      audience: 'Global',
      price_cents: 22900,
      description: 'High virality entertainment profile with recurring viral short-form videos.',
      verified: 1,
      status: 'published',
      login: 'dailyvibess.biz@gmail.com',
      password: 'VibesPass88#',
      recovery: 'recovery-vibes@deplugsocial.test',
      notes: 'TikTok creator fund eligible. Clean account standing with no strikes.',
    },
    {
      id: 3,
      platform: 'Facebook',
      title: 'US business page',
      handle: 'Local Market Daily',
      category: 'Business',
      followers: '27.4K',
      engagement: '4.9%',
      account_age: '5 years',
      audience: 'US',
      price_cents: 11900,
      description: 'Active regional business community page with strong organic reach.',
      verified: 1,
      status: 'published',
      login: 'localmarket.fb@gmail.com',
      password: 'MarketUS99!',
      recovery: 'recovery-market@deplugsocial.test',
      notes: 'Admin role transfer ready via Business Manager.',
    },
    {
      id: 4,
      platform: 'Twitter/X',
      title: 'Tech community account',
      handle: '@buildnotes',
      category: 'Technology',
      followers: '18.6K',
      engagement: '6.4%',
      account_age: '4 years',
      audience: 'Global',
      price_cents: 9500,
      description: 'Software engineering and startup discussion community with organic following.',
      verified: 0,
      status: 'sold',
      login: 'buildnotes.x@gmail.com',
      password: 'BuildTech2026#',
      recovery: 'recovery-tech@deplugsocial.test',
      notes: 'X account handle transfer and linked developer access credentials.',
    },
    {
      id: 5,
      platform: 'YouTube',
      title: 'Gaming channel',
      handle: 'Level Up Today',
      category: 'Gaming',
      followers: '9.2K',
      engagement: '7.1%',
      account_age: '3 years',
      audience: 'Global',
      price_cents: 17900,
      description: 'Gaming commentary and highlights channel close to monetization threshold.',
      verified: 1,
      status: 'published',
      login: 'leveluptoday.yt@gmail.com',
      password: 'LevelUpGamer1!',
      recovery: 'recovery-levelup@deplugsocial.test',
      notes: 'Brand account ownership transfer via Google account primary invite.',
    },
    {
      id: 6,
      platform: 'Telegram',
      title: 'Crypto community channel',
      handle: '@coinbriefs',
      category: 'Finance',
      followers: '15.7K',
      engagement: '9.4%',
      account_age: '2 years',
      audience: 'Global',
      price_cents: 13500,
      description: 'Dedicated cryptocurrency and web3 news broadcast channel with daily updates.',
      verified: 1,
      status: 'published',
      login: '+1 555 019 4820',
      password: 'CoinBriefsSecure!',
      recovery: 'recovery-crypto@deplugsocial.test',
      notes: 'Telegram channel owner transfer directly to buyer Telegram account.',
    },
    {
      id: 7,
      platform: 'Instagram',
      title: 'Fashion niche account',
      handle: '@theeditroom',
      category: 'Fashion',
      followers: '76.1K',
      engagement: '3.8%',
      account_age: '4 years',
      audience: 'Global',
      price_cents: 26500,
      description: 'Aesthetic fashion and editorial lookbook page with strong brand collaboration history.',
      verified: 1,
      status: 'published',
      login: 'theeditroom.ig@gmail.com',
      password: 'FashionEdit77$',
      recovery: 'recovery-fashion@deplugsocial.test',
      notes: 'Clean DM history, no copyright warnings, archive of media kits included.',
    },
    {
      id: 8,
      platform: 'TikTok',
      title: 'Food discovery account',
      handle: '@taste.trails',
      category: 'Food',
      followers: '33.9K',
      engagement: '7.8%',
      account_age: '1 year',
      audience: 'Global',
      price_cents: 10900,
      description: 'Fast-growing culinary discoveries and street food review account.',
      verified: 0,
      status: 'published',
      login: 'tastetrails.tok@gmail.com',
      password: 'TasteTrails2026@',
      recovery: 'recovery-food@deplugsocial.test',
      notes: 'Includes original footage folders and CapCut project templates.',
    },
  ];

  for (const item of catalog) {
    const existing = db.prepare('SELECT id FROM listings WHERE id = ?').get(item.id);
    if (!existing) {
      db.prepare(`
        INSERT INTO listings (
          id, platform, title, handle, category, followers, engagement, account_age, audience,
          price_cents, description, verified, status, login_credential, password_credential,
          recovery_email, transfer_notes, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        item.id, item.platform, item.title, item.handle, item.category, item.followers, item.engagement,
        item.account_age, item.audience, item.price_cents, item.description, item.verified, item.status,
        item.login, item.password, item.recovery, item.notes, admin.id
      );
    } else {
      // Update credentials and details if they are empty
      db.prepare(`
        UPDATE listings SET
          login_credential = CASE WHEN login_credential = '' THEN ? ELSE login_credential END,
          password_credential = CASE WHEN password_credential = '' THEN ? ELSE password_credential END,
          recovery_email = CASE WHEN recovery_email = '' THEN ? ELSE recovery_email END,
          transfer_notes = CASE WHEN transfer_notes = '' THEN ? ELSE transfer_notes END
        WHERE id = ?
      `).run(item.login, item.password, item.recovery, item.notes, item.id);
    }
  }

  // Seed sample orders if orders table is empty
  const orderCount = db.prepare('SELECT COUNT(*) AS count FROM orders').get().count;
  if (orderCount === 0 && buyer) {
    const seedOrders = [
      {
        ref: 'TEST-0001-2026',
        userId: buyer.id,
        listingId: 1,
        amount: 14900,
        contactName: 'Test Buyer',
        contactEmail: 'buyer@deplugsocial.test',
        paymentMethod: 'card',
        deliveryStatus: 'delivered',
        createdAt: '2026-09-20T10:15:00.000Z',
      },
      {
        ref: 'TEST-0002-2026',
        userId: buyer.id,
        listingId: 4,
        amount: 9500,
        contactName: 'Test Buyer',
        contactEmail: 'buyer@deplugsocial.test',
        paymentMethod: 'card',
        deliveryStatus: 'processing',
        createdAt: '2026-09-18T14:30:00.000Z',
      },
      {
        ref: 'TEST-0003-2026',
        userId: null,
        listingId: 2,
        amount: 22900,
        contactName: 'Jordan Lee',
        contactEmail: 'jordan@example.com',
        paymentMethod: 'transfer',
        deliveryStatus: 'processing',
        createdAt: '2026-09-17T09:00:00.000Z',
      },
    ];

    const insertOrder = db.prepare(`
      INSERT INTO orders (
        order_reference, user_id, listing_id, amount_cents, contact_name, contact_email,
        payment_method, payment_status, delivery_status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'completed', ?, ?)
    `);

    db.transaction(() => {
      for (const ord of seedOrders) {
        insertOrder.run(
          ord.ref, ord.userId, ord.listingId, ord.amount, ord.contactName, ord.contactEmail,
          ord.paymentMethod, ord.deliveryStatus, ord.createdAt
        );
      }
    })();
  }
}
