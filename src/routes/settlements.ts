import { Router, Request, Response } from 'express';
import db from '../db/knex';
import { requireMemberToken } from '../middleware/auth';
import { computeDirectDebts } from '../lib/computeDirectDebts';

const router = Router({ mergeParams: true });

// GET /api/events/:inviteCode/settlement
router.get('/', async (req: Request, res: Response) => {
  const event = await db('events').where({ invite_code: req.params.inviteCode }).first();
  if (!event) { res.status(404).json({ error: 'Event not found' }); return; }

  const expenses = await db('expenses').where({ event_id: event.id });
  if (!expenses.length) { res.json([]); return; }

  const splits = await db('expense_splits')
    .whereIn('expense_id', expenses.map((e) => e.id));

  const members = await db('members')
    .where({ event_id: event.id })
    .select('id', 'name');

  const nameMap: Record<string, string> = {};
  for (const m of members) nameMap[m.id] = m.name;

  const payments = computeDirectDebts(expenses, splits);

  res.json(
    payments.map((p) => ({
      fromMemberId: p.fromMemberId,
      fromName: nameMap[p.fromMemberId] ?? p.fromMemberId,
      toMemberId: p.toMemberId,
      toName: nameMap[p.toMemberId] ?? p.toMemberId,
      amountCents: p.amountCents,
    }))
  );
});

// POST /api/events/:inviteCode/settlements/mark
router.post('/mark', requireMemberToken, async (req: Request, res: Response) => {
  const { to_member_id, amount_cents } = req.body;
  if (!to_member_id || amount_cents == null) {
    res.status(400).json({ error: 'to_member_id and amount_cents required' });
    return;
  }

  const event = await db('events').where({ invite_code: req.params.inviteCode }).first();
  if (!event) { res.status(404).json({ error: 'Event not found' }); return; }

  const [settlement] = await db('settlements')
    .insert({
      event_id: event.id,
      from_member_id: res.locals.member.id,
      to_member_id,
      amount_cents: Number(amount_cents),
      is_settled: true,
    })
    .returning('*');

  res.status(201).json(settlement);
});

export default router;
