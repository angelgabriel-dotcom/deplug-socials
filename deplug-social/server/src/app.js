import bcrypt from 'bcryptjs';
import cors from 'cors';
import express from 'express';
import { createSession, db, hashToken, publicListing, publicOrder, publicUser } from './db.js';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const app = express();

app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' }));
app.use(express.json({ limit: '20kb' }));

function authRequired(req, res, next) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (!token) return res.status(401).json({ message: 'Authentication is required.' });

  const session = db.prepare(`
    SELECT users.* FROM sessions
    JOIN users ON users.id = sessions.user_id
    WHERE sessions.token_hash = ? AND sessions.expires_at > ?
  `).get(hashToken(token), new Date().toISOString());

  if (!session) return res.status(401).json({ message: 'Your session has expired. Please log in again.' });
  req.user = session;
  req.sessionToken = token;
  return next();
}

function optionalAuth(req, _res, next) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (!token) return next();

  const session = db.prepare(`
    SELECT users.* FROM sessions
    JOIN users ON users.id = sessions.user_id
    WHERE sessions.token_hash = ? AND sessions.expires_at > ?
  `).get(hashToken(token), new Date().toISOString());

  if (session) {
    req.user = session;
    req.sessionToken = token;
  }
  return next();
}

function adminRequired(req, res, next) {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Admin access is required.' });
  return next();
}

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

/* ==========================================================================
   AUTH ENDPOINTS
   ========================================================================== */

app.post('/api/auth/register', async (req, res, next) => {
  try {
    const { name, username, email, password } = req.body;
    const normalizedEmail = email?.trim().toLowerCase();
    const normalizedUsername = username?.trim().toLowerCase();

    if (!name?.trim() || !normalizedUsername || !normalizedEmail || !password) {
      return res.status(400).json({ message: 'Name, username, email, and password are required.' });
    }
    if (!emailPattern.test(normalizedEmail)) return res.status(400).json({ message: 'Enter a valid email address.' });
    if (!/^[a-z0-9_]{3,24}$/.test(normalizedUsername)) return res.status(400).json({ message: 'Username must be 3–24 characters using letters, numbers, or underscores.' });
    if (password.length < 8) return res.status(400).json({ message: 'Password must be at least 8 characters.' });

    const duplicate = db.prepare('SELECT id FROM users WHERE email = ? OR username = ?').get(normalizedEmail, normalizedUsername);
    if (duplicate) return res.status(409).json({ message: 'An account with that email or username already exists.' });

    const passwordHash = await bcrypt.hash(password, 12);
    const result = db.prepare('INSERT INTO users (name, username, email, password_hash, role) VALUES (?, ?, ?, ?, ?)')
      .run(name.trim(), normalizedUsername, normalizedEmail, passwordHash, 'buyer');
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid);
    const session = createSession(user.id);
    return res.status(201).json({ user: publicUser(user), session });
  } catch (error) { return next(error); }
});

app.post('/api/auth/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email and password are required.' });
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.trim().toLowerCase());
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }
    const session = createSession(user.id);
    return res.json({ user: publicUser(user), session });
  } catch (error) { return next(error); }
});

app.post('/api/auth/logout', authRequired, (req, res) => {
  db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(hashToken(req.sessionToken));
  return res.status(204).end();
});

app.get('/api/auth/me', authRequired, (req, res) => res.json({ user: publicUser(req.user) }));

app.patch('/api/auth/profile', authRequired, (req, res) => {
  const { name, username } = req.body;
  const normalizedUsername = username?.trim().toLowerCase();
  if (!name?.trim() || !normalizedUsername) return res.status(400).json({ message: 'Name and username are required.' });
  if (!/^[a-z0-9_]{3,24}$/.test(normalizedUsername)) return res.status(400).json({ message: 'Username must be 3–24 characters using letters, numbers, or underscores.' });
  const duplicate = db.prepare('SELECT id FROM users WHERE username = ? AND id != ?').get(normalizedUsername, req.user.id);
  if (duplicate) return res.status(409).json({ message: 'That username is already in use.' });
  db.prepare('UPDATE users SET name = ?, username = ? WHERE id = ?').run(name.trim(), normalizedUsername, req.user.id);
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  return res.json({ user: publicUser(user) });
});

/* ==========================================================================
   LISTINGS ENDPOINTS
   ========================================================================== */

app.get('/api/listings', (req, res, next) => {
  try {
    const { platform, category, search, status } = req.query;
    let query = 'SELECT * FROM listings WHERE 1=1';
    const params = [];

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    } else {
      query += " AND status IN ('published', 'sold')";
    }

    if (platform && platform !== 'all') {
      query += ' AND platform = ?';
      params.push(platform);
    }

    if (category && category !== 'all') {
      query += ' AND category = ?';
      params.push(category);
    }

    if (search?.trim()) {
      query += ' AND (title LIKE ? OR handle LIKE ? OR category LIKE ? OR platform LIKE ?)';
      const term = `%${search.trim()}%`;
      params.push(term, term, term, term);
    }

    query += ' ORDER BY id ASC';
    const rows = db.prepare(query).all(...params);
    return res.json({ listings: rows.map(publicListing) });
  } catch (error) { return next(error); }
});

app.get('/api/listings/:id', (req, res, next) => {
  try {
    const listing = db.prepare('SELECT * FROM listings WHERE id = ?').get(req.params.id);
    if (!listing) return res.status(404).json({ message: 'Listing not found.' });
    return res.json({ listing: publicListing(listing) });
  } catch (error) { return next(error); }
});

/* ==========================================================================
   ORDERS / TRANSACTION ENDPOINTS
   ========================================================================== */

app.post('/api/orders', optionalAuth, (req, res, next) => {
  try {
    const { listingId, contactName, contactEmail, paymentMethod } = req.body;

    if (!listingId) return res.status(400).json({ message: 'Listing ID is required.' });
    if (!contactName?.trim()) return res.status(400).json({ message: 'Full name is required.' });
    if (!contactEmail?.trim() || !emailPattern.test(contactEmail.trim().toLowerCase())) {
      return res.status(400).json({ message: 'A valid email address is required.' });
    }

    const listing = db.prepare('SELECT * FROM listings WHERE id = ?').get(listingId);
    if (!listing) return res.status(404).json({ message: 'Listing not found.' });

    if (listing.status === 'sold') {
      return res.status(400).json({ message: 'This account has already been purchased.' });
    }

    // Determine owner user ID if authenticated or matching email
    let userId = req.user?.id || null;
    if (!userId) {
      const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(contactEmail.trim().toLowerCase());
      if (existingUser) userId = existingUser.id;
    }

    // Generate reference code
    const randomCode = Math.floor(1000 + Math.random() * 9000);
    const orderReference = `TEST-${randomCode}-2026`;

    const createOrderTransaction = db.transaction(() => {
      const result = db.prepare(`
        INSERT INTO orders (
          order_reference, user_id, listing_id, amount_cents, contact_name, contact_email,
          payment_method, payment_status, delivery_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'completed', 'delivered')
      `).run(
        orderReference,
        userId,
        listing.id,
        listing.price_cents,
        contactName.trim(),
        contactEmail.trim().toLowerCase(),
        paymentMethod || 'card'
      );

      db.prepare("UPDATE listings SET status = 'sold' WHERE id = ?").run(listing.id);

      return result.lastInsertRowid;
    });

    const newOrderId = createOrderTransaction();
    const createdOrder = db.prepare(`
      SELECT orders.*, listings.platform, listings.title, listings.handle, listings.category,
             listings.followers, listings.engagement, listings.login_credential,
             listings.password_credential, listings.recovery_email, listings.transfer_notes
      FROM orders
      JOIN listings ON listings.id = orders.listing_id
      WHERE orders.id = ?
    `).get(newOrderId);

    return res.status(201).json({
      order: publicOrder(createdOrder),
      message: 'Payment confirmed! Account credentials have been delivered.',
    });
  } catch (error) { return next(error); }
});

app.get('/api/orders/me', authRequired, (req, res, next) => {
  try {
    const orders = db.prepare(`
      SELECT orders.*, listings.platform, listings.title, listings.handle, listings.category,
             listings.followers, listings.engagement, listings.login_credential,
             listings.password_credential, listings.recovery_email, listings.transfer_notes
      FROM orders
      JOIN listings ON listings.id = orders.listing_id
      WHERE orders.user_id = ? OR orders.contact_email = ?
      ORDER BY orders.created_at DESC
    `).all(req.user.id, req.user.email);

    return res.json({ orders: orders.map(publicOrder) });
  } catch (error) { return next(error); }
});

app.get('/api/orders/reference/:reference', optionalAuth, (req, res, next) => {
  try {
    const order = db.prepare(`
      SELECT orders.*, listings.platform, listings.title, listings.handle, listings.category,
             listings.followers, listings.engagement, listings.login_credential,
             listings.password_credential, listings.recovery_email, listings.transfer_notes
      FROM orders
      JOIN listings ON listings.id = orders.listing_id
      WHERE orders.order_reference = ?
    `).get(req.params.reference);

    if (!order) return res.status(404).json({ message: 'Order not found.' });

    const isOwner = req.user && (req.user.id === order.user_id || req.user.email === order.contact_email);
    const result = publicOrder(order);
    if (!isOwner) result.credentials = null;

    return res.json({ order: result });
  } catch (error) { return next(error); }
});

/* ==========================================================================
   ADMIN ENDPOINTS
   ========================================================================== */

app.get('/api/admin/check', authRequired, adminRequired, (req, res) => res.json({ user: publicUser(req.user) }));

app.get('/api/admin/orders', authRequired, adminRequired, (_req, res, next) => {
  try {
    const rows = db.prepare(`
      SELECT orders.*, listings.platform, listings.title, listings.handle, listings.category,
             listings.followers, listings.engagement, listings.login_credential,
             listings.password_credential, listings.recovery_email, listings.transfer_notes,
             users.name AS user_name, users.email AS user_email
      FROM orders
      JOIN listings ON listings.id = orders.listing_id
      LEFT JOIN users ON users.id = orders.user_id
      ORDER BY orders.created_at DESC
    `).all();

    return res.json({ orders: rows.map(publicOrder) });
  } catch (error) { return next(error); }
});

app.patch('/api/admin/orders/:id', authRequired, adminRequired, (req, res, next) => {
  try {
    const { deliveryStatus } = req.body;
    const valid = ['processing', 'delivered', 'cancelled'];
    if (!deliveryStatus || !valid.includes(deliveryStatus.toLowerCase())) {
      return res.status(400).json({ message: 'Invalid delivery status.' });
    }

    db.prepare('UPDATE orders SET delivery_status = ? WHERE id = ? OR order_reference = ?')
      .run(deliveryStatus.toLowerCase(), req.params.id, req.params.id);

    const order = db.prepare(`
      SELECT orders.*, listings.platform, listings.title, listings.handle, listings.category,
             listings.followers, listings.engagement, listings.login_credential,
             listings.password_credential, listings.recovery_email, listings.transfer_notes
      FROM orders
      JOIN listings ON listings.id = orders.listing_id
      WHERE orders.id = ? OR orders.order_reference = ?
    `).get(req.params.id, req.params.id);

    return res.json({ order: publicOrder(order) });
  } catch (error) { return next(error); }
});

app.use((error, _req, res, next) => {
  void next;
  console.error(error);
  return res.status(500).json({ message: 'Something went wrong. Please try again.' });
});
