import bcrypt from 'bcryptjs';
import cors from 'cors';
import crypto from 'node:crypto';
import express from 'express';
import { createSession, db, hashToken, publicListing, publicOrder, publicUser } from './db.js';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const app = express();

app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' }));
app.post('/api/payments/paystack/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  const signature = req.headers['x-paystack-signature'];
  const expected = secretKey ? crypto.createHmac('sha512', secretKey).update(req.body).digest('hex') : '';
  if (!secretKey || !signature || signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return res.status(401).end();
  const event = JSON.parse(req.body.toString('utf8'));
  if (event.event !== 'charge.success') return res.sendStatus(200);
  const transaction = event.data;
  const order = db.prepare('SELECT * FROM orders WHERE paystack_reference = ?').get(transaction.reference);
  if (order && transaction.amount === order.amount_cents && transaction.currency === order.currency) finalizeVerifiedPayment(order.id, transaction.id);
  return res.sendStatus(200);
});
app.use(express.json({ limit: '20kb' }));

const paystackBaseUrl = 'https://api.paystack.co';
const paystackCurrency = process.env.PAYSTACK_CURRENCY || 'NGN';

async function paystackRequest(path, options = {}) {
  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!secretKey) {
    const error = new Error('Paystack is not configured. Add PAYSTACK_SECRET_KEY to the server .env file.');
    error.statusCode = 503;
    throw error;
  }
  let response;
  try {
    response = await fetch(`${paystackBaseUrl}${path}`, {
      ...options,
      headers: { Authorization: `Bearer ${secretKey}`, 'Content-Type': 'application/json', ...options.headers },
    });
  } catch (cause) {
    const error = new Error('Unable to reach Paystack. Check this server\'s internet connection and try again.');
    error.statusCode = 502;
    error.cause = cause;
    throw error;
  }
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.status) {
    const error = new Error(payload?.message || 'Paystack could not process this request.');
    error.statusCode = 502;
    throw error;
  }
  return payload.data;
}

function getOrderWithListing(orderId) {
  return db.prepare(`
    SELECT orders.*, listings.platform, listings.title, listings.handle, listings.category,
           listings.followers, listings.engagement, listings.login_credential,
           listings.password_credential, listings.recovery_email, listings.transfer_notes
    FROM orders JOIN listings ON listings.id = orders.listing_id WHERE orders.id = ?
  `).get(orderId);
}

function releaseExpiredPaymentReservations() {
  const staleOrders = db.prepare(`SELECT listing_id FROM orders WHERE payment_status = 'pending' AND created_at < datetime('now', '-30 minutes')`).all();
  if (!staleOrders.length) return;
  const release = db.transaction(() => {
    for (const order of staleOrders) {
      db.prepare("UPDATE orders SET payment_status = 'failed' WHERE listing_id = ? AND payment_status = 'pending'").run(order.listing_id);
      db.prepare("UPDATE listings SET status = 'published', updated_at = CURRENT_TIMESTAMP WHERE id = ? AND status = 'payment_pending'").run(order.listing_id);
    }
  });
  release();
}

function finalizeVerifiedPayment(orderId, transactionId) {
  return db.transaction(() => {
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
    if (!order) return { error: 'Order not found.' };
    if (order.payment_status === 'completed') return { order: getOrderWithListing(orderId) };
    const sale = db.prepare("UPDATE listings SET status = 'sold', updated_at = CURRENT_TIMESTAMP WHERE id = ? AND status = 'payment_pending'").run(order.listing_id);
    if (sale.changes !== 1) {
      db.prepare("UPDATE orders SET payment_status = 'failed' WHERE id = ?").run(orderId);
      return { error: 'This listing is no longer available. Please contact support for a refund.' };
    }
    db.prepare("UPDATE orders SET payment_status = 'completed', delivery_status = 'processing', paystack_transaction_id = ?, paid_at = CURRENT_TIMESTAMP WHERE id = ?")
      .run(String(transactionId || ''), orderId);
    return { order: getOrderWithListing(orderId) };
  })();
}

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
    releaseExpiredPaymentReservations();
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
    releaseExpiredPaymentReservations();
    const listing = db.prepare('SELECT * FROM listings WHERE id = ?').get(req.params.id);
    if (!listing) return res.status(404).json({ message: 'Listing not found.' });
    return res.json({ listing: publicListing(listing) });
  } catch (error) { return next(error); }
});

/* ==========================================================================
   ORDERS / TRANSACTION ENDPOINTS
   ========================================================================== */

app.post('/api/payments/paystack/initialize', authRequired, async (req, res, next) => {
  try {
    releaseExpiredPaymentReservations();
    const { listingId, contactName } = req.body;
    const contactEmail = req.user.email;

    if (!listingId) return res.status(400).json({ message: 'Listing ID is required.' });
    if (!contactName?.trim()) return res.status(400).json({ message: 'Full name is required.' });

    const listing = db.prepare('SELECT * FROM listings WHERE id = ?').get(listingId);
    if (!listing) return res.status(404).json({ message: 'Listing not found.' });

    if (listing.status !== 'published') return res.status(400).json({ message: 'This listing is not available for purchase.' });

    const reference = `DSP_${crypto.randomUUID().replaceAll('-', '')}`;
    const orderReference = `ORD-${reference.slice(-10).toUpperCase()}`;
    const result = db.transaction(() => {
      const reserved = db.prepare("UPDATE listings SET status = 'payment_pending', updated_at = CURRENT_TIMESTAMP WHERE id = ? AND status = 'published'").run(listing.id);
      if (reserved.changes !== 1) return null;
      return db.prepare(`INSERT INTO orders (order_reference, user_id, listing_id, amount_cents, currency, contact_name, contact_email, payment_method, payment_status, delivery_status, paystack_reference)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'paystack', 'pending', 'processing', ?)`)
        .run(orderReference, req.user.id, listing.id, listing.price_cents, paystackCurrency, contactName.trim(), contactEmail, reference);
    })();
    if (!result) return res.status(409).json({ message: 'Another buyer has just started checkout for this listing. Please try again later.' });

    try {
      const checkout = await paystackRequest('/transaction/initialize', {
        method: 'POST',
        body: JSON.stringify({
          email: contactEmail,
          amount: String(listing.price_cents),
          currency: paystackCurrency,
          reference,
          callback_url: process.env.PAYSTACK_CALLBACK_URL || `${process.env.CLIENT_ORIGIN || 'http://localhost:5173'}/payment/verify`,
          metadata: JSON.stringify({ orderId: result.lastInsertRowid, listingId: listing.id }),
        }),
      });
      return res.status(201).json({ authorizationUrl: checkout.authorization_url, reference: checkout.reference });
    } catch (error) {
      db.transaction(() => {
        db.prepare("UPDATE orders SET payment_status = 'failed' WHERE id = ?").run(result.lastInsertRowid);
        db.prepare("UPDATE listings SET status = 'published', updated_at = CURRENT_TIMESTAMP WHERE id = ? AND status = 'payment_pending'").run(listing.id);
      })();
      throw error;
    }
  } catch (error) { return next(error); }
});

app.post('/api/payments/paystack/verify/:reference', authRequired, async (req, res, next) => {
  try {
    const order = db.prepare('SELECT * FROM orders WHERE paystack_reference = ? AND user_id = ?').get(req.params.reference, req.user.id);
    if (!order) return res.status(404).json({ message: 'Payment transaction not found.' });
    const transaction = await paystackRequest(`/transaction/verify/${encodeURIComponent(order.paystack_reference)}`);
    if (transaction.status !== 'success') return res.status(409).json({ message: 'Payment has not been completed yet.', paymentStatus: transaction.status });
    if (transaction.amount !== order.amount_cents || transaction.currency !== order.currency || transaction.reference !== order.paystack_reference) {
      return res.status(409).json({ message: 'Payment verification did not match this order.' });
    }
    const finalized = finalizeVerifiedPayment(order.id, transaction.id);
    if (finalized.error) return res.status(409).json({ message: finalized.error });
    return res.json({ order: publicOrder(finalized.order) });
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

app.get('/api/orders/reference/:reference', authRequired, (req, res, next) => {
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

    const isOwner = req.user.id === order.user_id || req.user.email === order.contact_email || req.user.role === 'admin';
    if (!isOwner) return res.status(403).json({ message: 'You do not have access to this order.' });
    const result = publicOrder(order);

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
  const statusCode = Number.isInteger(error.statusCode) ? error.statusCode : 500;
  const message = statusCode < 500 ? error.message : 'Something went wrong. Please try again.';
  return res.status(statusCode).json({ message });
});
