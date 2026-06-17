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
    .where({ event_id: event.id })
    .select('id', 'name', 'photo_url', 'created_at');

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

  const expensesWithSplits = expenses.map((e) => ({
    ...e,
    splits: splits.filter((s) => s.expense_id === e.id),
  }));

  res.json({ ...event, members, expenses: expensesWithSplits, balances, settlement });
});

export default router;
