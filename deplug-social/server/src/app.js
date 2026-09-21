import bcrypt from 'bcryptjs';
import cors from 'cors';
import express from 'express';
import { createSession, db, hashToken, publicUser } from './db.js';

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

function adminRequired(req, res, next) {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Admin access is required.' });
  return next();
}

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

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
app.get('/api/admin/check', authRequired, adminRequired, (req, res) => res.json({ user: publicUser(req.user) }));

app.use((error, _req, res, next) => {
  void next;
  console.error(error);
  return res.status(500).json({ message: 'Something went wrong. Please try again.' });
});
