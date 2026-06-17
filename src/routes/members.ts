import { Router, Request, Response } from 'express';
import db from '../db/knex';
import { requireMemberToken } from '../middleware/auth';

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

  const [member] = await db('members')
    .insert({ event_id: event.id, name, photo_url: photo_url ?? null })
    .returning('*');

  res.status(201).json({
    id: member.id,
    name: member.name,
    photo_url: member.photo_url,
    member_token: member.member_token,
    event_id: member.event_id,
  });
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
