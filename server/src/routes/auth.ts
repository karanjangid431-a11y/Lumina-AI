import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { env } from '../config/env.js';

const router = Router();

const usersDb = new Map<string, { id: string; email: string; name: string; passwordHash: string }>();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(2),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

// Register
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, password, name } = registerSchema.parse(req.body);
    if (usersDb.has(email.toLowerCase())) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = {
      id: `usr-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      email: email.toLowerCase(),
      name,
      passwordHash,
    };
    usersDb.set(email.toLowerCase(), user);

    const token = jwt.sign({ id: user.id, email: user.email, name: user.name, isGuest: false }, env.JWT_SECRET, {
      expiresIn: '7d',
    });

    return res.status(201).json({
      token,
      user: { id: user.id, email: user.email, name: user.name, isGuest: false },
    });
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'Invalid registration request' });
  }
});

// Login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = loginSchema.parse(req.body);
    const user = usersDb.get(email.toLowerCase());
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign({ id: user.id, email: user.email, name: user.name, isGuest: false }, env.JWT_SECRET, {
      expiresIn: '7d',
    });

    return res.json({
      token,
      user: { id: user.id, email: user.email, name: user.name, isGuest: false },
    });
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'Invalid login request' });
  }
});

// Continue as Guest
router.post('/guest', (req: Request, res: Response) => {
  const guestId = `guest-${Date.now()}`;
  const guestUser = {
    id: guestId,
    email: `guest_${guestId.slice(-4)}@lumina.local`,
    name: 'Guest Scholar',
    isGuest: true,
  };

  const token = jwt.sign(guestUser, env.JWT_SECRET, { expiresIn: '24h' });
  return res.json({ token, user: guestUser });
});

// Current User Profile
router.get('/me', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET);
    return res.json({ user: decoded });
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
});

export default router;
