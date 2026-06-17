import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import db from '../db/knex';
import { signToken, verifyToken } from '../lib/jwt';

const router = Router();

router.post('/register', async (req: Request, res: Response) => {
  const { email, password, name } = req.body;
  if (!email || !password || !name) {
    res.status(400).json({ error: 'email وpassword واسم مطلوبون' });
    return;
  }
  if (password.length < 6) {
    res.status(400).json({ error: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' });
    return;
  }
  const existing = await db('users').where({ email: email.toLowerCase() }).first();
  if (existing) {
    res.status(409).json({ error: 'هذا البريد الإلكتروني مسجل مسبقاً' });
    return;
  }
  const password_hash = await bcrypt.hash(password, 10);
  const [user] = await db('users')
    .insert({ email: email.toLowerCase(), password_hash, name })
    .returning(['id', 'email', 'name', 'photo_url', 'language']);
  const token = signToken(user.id);
  res.status(201).json({ token, user });
});

router.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: 'البريد الإلكتروني وكلمة المرور مطلوبان' });
    return;
  }
  const user = await db('users').where({ email: email.toLowerCase() }).first();
  if (!user) {
    res.status(401).json({ error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' });
    return;
  }
  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    res.status(401).json({ error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' });
    return;
  }
  const token = signToken(user.id);
  res.json({ token, user: { id: user.id, email: user.email, name: user.name, photo_url: user.photo_url, language: user.language } });
});

router.get('/me', async (req: Request, res: Response) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'غير مصرح' });
    return;
  }
  try {
    const { sub } = verifyToken(authHeader.slice(7));
    const user = await db('users').where({ id: sub }).first();
    if (!user) { res.status(404).json({ error: 'المستخدم غير موجود' }); return; }
    res.json({ id: user.id, email: user.email, name: user.name, photo_url: user.photo_url, language: user.language });
  } catch {
    res.status(401).json({ error: 'جلسة منتهية، سجل الدخول مجدداً' });
  }
});

router.patch('/me', async (req: Request, res: Response) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'غير مصرح' });
    return;
  }
  try {
    const { sub } = verifyToken(authHeader.slice(7));
    const { name, photo_url, language } = req.body;
    const updates: Record<string, string> = {};
    if (name) updates.name = name;
    if (photo_url !== undefined) updates.photo_url = photo_url;
    if (language) updates.language = language;
    const [user] = await db('users').where({ id: sub }).update(updates).returning(['id', 'email', 'name', 'photo_url', 'language']);
    res.json(user);
  } catch {
    res.status(401).json({ error: 'جلسة منتهية، سجل الدخول مجدداً' });
  }
});

export default router;
