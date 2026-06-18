import { Router, Request, Response } from 'express';
import db from '../db/knex';
import { v4 as uuidv4 } from 'uuid';
import { computeBalances } from '../lib/computeBalances';
import { simplifyDebts } from '../lib/simplifyDebts';

const router = Router();

// POST /api/events
router.post('/', async (req: Request, res: Response) => {
  const { name, currency = 'SAR' } = req.body;
  if (!name || typeof name !== 'string') {
    res.status(400).json({ error: 'name is required' });
    return;
  }

  const invite_code = uuidv4().split('-')[0] + '-' + uuidv4().split('-')[0];
  const [event] = await db('events').insert({ name, currency, invite_code }).returning('*');
  res.status(201).json(event);
});

// GET /api/events/:inviteCode
router.get('/:inviteCode', async (req: Request, res: Response) => {
  const event = await db('events').where({ invite_code: req.params.inviteCode }).first();
  if (!event) { res.status(404).json({ error: 'Event not found' }); return; }

  const members = await db('members')
    .where('members.event_id', event.id)
    .leftJoin('users', 'members.user_id', 'users.id')
    .select(
      'members.id',
      'members.name',
      db.raw('COALESCE(members.photo_url, users.photo_url) as photo_url'),
      'members.created_at'
    )
    .orderBy('members.created_at', 'asc');

  // Identify the requesting member (via token or JWT)
  let callerMemberId: string | null = null;
  const memberToken = req.headers['x-member-token'] as string | undefined;
  if (memberToken) {
    const m = await db('members').where({ member_token: memberToken, event_id: event.id }).first();
    if (m) callerMemberId = m.id;
  }
  if (!callerMemberId) {
    const authHeader = req.headers['authorization'];
    if (authHeader?.startsWith('Bearer ')) {
      try {
        const { verifyToken } = await import('../lib/jwt');
        const { sub } = verifyToken(authHeader.slice(7));
        const m = await db('members').where({ user_id: sub, event_id: event.id }).first();
        if (m) callerMemberId = m.id;
      } catch { /* ignore */ }
    }
  }

  const expenses = await db('expenses')
    .where({ event_id: event.id })
    .orderBy('created_at', 'asc');

  const splits = expenses.length
    ? await db('expense_splits').whereIn('expense_id', expenses.map((e) => e.id))
    : [];

  let balances: { memberId: string; netCents: number }[] = [];
  let settlement: { fromMemberId: string; toMemberId: string; amountCents: number }[] = [];

  if (expenses.length && splits.length) {
    try {
      balances = computeBalances(expenses, splits);
      settlement = simplifyDebts(balances);
    } catch (_) {
      // return empty if invariant fails (e.g. partial data)
    }
  }

  const allExpensesWithSplits = expenses.map((e) => ({
    ...e,
    splits: splits.filter((s) => s.expense_id === e.id),
  }));

  // Only return expenses the caller is involved in
  const visibleExpenses = callerMemberId
    ? allExpensesWithSplits.filter((e) =>
        e.paid_by === callerMemberId ||
        e.splits.some((sp: { member_id: string }) => sp.member_id === callerMemberId)
      )
    : allExpensesWithSplits;

  res.json({ ...event, members, expenses: visibleExpenses, balances, settlement });
});

// PATCH /api/events/:inviteCode — rename trip (any member with valid token)
router.patch('/:inviteCode', async (req: Request, res: Response) => {
  const memberToken = req.headers['x-member-token'] as string;
  if (!memberToken) { res.status(401).json({ error: 'غير مصرح' }); return; }

  const event = await db('events').where({ invite_code: req.params.inviteCode }).first();
  if (!event) { res.status(404).json({ error: 'Event not found' }); return; }

  const member = await db('members').where({ member_token: memberToken, event_id: event.id }).first();
  if (!member) { res.status(403).json({ error: 'غير مصرح' }); return; }

  const { name, photo_url } = req.body;
  if (!name?.trim() && photo_url === undefined) { res.status(400).json({ error: 'لا توجد تغييرات' }); return; }

  const updates: Record<string, string | null> = {};
  if (name?.trim()) updates.name = name.trim();
  if (photo_url !== undefined) updates.photo_url = photo_url;

  const [updated] = await db('events').where({ id: event.id }).update(updates).returning('*');
  res.json(updated);
});

// DELETE /api/events/:inviteCode — delete entire trip
router.delete('/:inviteCode', async (req: Request, res: Response) => {
  const memberToken = req.headers['x-member-token'] as string;
  if (!memberToken) { res.status(401).json({ error: 'غير مصرح' }); return; }

  const event = await db('events').where({ invite_code: req.params.inviteCode }).first();
  if (!event) { res.status(404).json({ error: 'Event not found' }); return; }

  const member = await db('members').where({ member_token: memberToken, event_id: event.id }).first();
  if (!member) { res.status(403).json({ error: 'غير مصرح' }); return; }

  const expenseIds = await db('expenses').where({ event_id: event.id }).pluck('id');
  if (expenseIds.length) await db('expense_splits').whereIn('expense_id', expenseIds).delete();
  await db('expenses').where({ event_id: event.id }).delete();
  await db('members').where({ event_id: event.id }).delete();
  await db('events').where({ id: event.id }).delete();

  res.json({ ok: true });
});

// DELETE /api/events/:inviteCode/members/:memberId — remove member
router.delete('/:inviteCode/members/:memberId', async (req: Request, res: Response) => {
  const memberToken = req.headers['x-member-token'] as string;
  if (!memberToken) { res.status(401).json({ error: 'غير مصرح' }); return; }

  const event = await db('events').where({ invite_code: req.params.inviteCode }).first();
  if (!event) { res.status(404).json({ error: 'Event not found' }); return; }

  const requester = await db('members').where({ member_token: memberToken, event_id: event.id }).first();
  if (!requester) { res.status(403).json({ error: 'غير مصرح' }); return; }

  await db('members').where({ id: req.params.memberId, event_id: event.id }).delete();
  res.json({ ok: true });
});

export default router;
