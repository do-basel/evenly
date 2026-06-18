import { Router, Request, Response } from 'express';
import db from '../db/knex';
import { requireMemberToken } from '../middleware/auth';
import { verifyToken } from '../lib/jwt';

const router = Router({ mergeParams: true });

// POST /api/events/:inviteCode/members — join event
router.post('/', async (req: Request, res: Response) => {
  const { name, photo_url } = req.body;
  if (!name || typeof name !== 'string') {
    res.status(400).json({ error: 'name is required' });
    return;
  }

  const event = await db('events').where({ invite_code: req.params.inviteCode }).first();
  if (!event) { res.status(404).json({ error: 'Event not found' }); return; }

  // Link to user account if JWT present
  let user_id: string | null = null;
  const authHeader = req.headers['authorization'];
  if (authHeader?.startsWith('Bearer ')) {
    try { user_id = verifyToken(authHeader.slice(7)).sub; } catch { /* ignore */ }
  }

  // If authenticated, return existing membership instead of creating a duplicate
  if (user_id) {
    const existing = await db('members').where({ event_id: event.id, user_id }).first();
    if (existing) {
      return res.json({
        id: existing.id,
        name: existing.name,
        photo_url: existing.photo_url,
        member_token: existing.member_token,
        event_id: existing.event_id,
      });
    }
  }

  const [member] = await db('members')
    .insert({ event_id: event.id, name, photo_url: photo_url ?? null, user_id })
    .returning('*');

  res.status(201).json({
    id: member.id,
    name: member.name,
    photo_url: member.photo_url,
    member_token: member.member_token,
    event_id: member.event_id,
  });
});

// PATCH /api/events/:inviteCode/members/me — update own photo
router.patch('/me', requireMemberToken, async (req: Request, res: Response) => {
  const member = res.locals.member;
  const event = await db('events').where({ invite_code: req.params.inviteCode }).first();
  if (!event) { res.status(404).json({ error: 'Event not found' }); return; }
  if (member.event_id !== event.id) { res.status(403).json({ error: 'غير مصرح' }); return; }

  const { photo_url } = req.body;
  if (photo_url === undefined) { res.status(400).json({ error: 'photo_url required' }); return; }

  const [updated] = await db('members').where({ id: member.id }).update({ photo_url }).returning(['id', 'name', 'photo_url']);
  res.json(updated);
});

// GET /api/events/:inviteCode/me — identify returning device
router.get('/me', requireMemberToken, async (req: Request, res: Response) => {
  const member = res.locals.member;
  const event = await db('events').where({ invite_code: req.params.inviteCode }).first();
  if (!event) { res.status(404).json({ error: 'Event not found' }); return; }

  if (member.event_id !== event.id) {
    res.status(403).json({ error: 'Token does not belong to this event' });
    return;
  }

  res.json({ id: member.id, name: member.name, photo_url: member.photo_url, event_id: member.event_id });
});

export default router;
