import { Router, Request, Response } from 'express';
import db from '../db/knex';
import { requireMemberToken } from '../middleware/auth';
import { computeSplit, SplitType } from '../lib/computeSplit';

const router = Router({ mergeParams: true });

async function getEvent(inviteCode: string) {
  return db('events').where({ invite_code: inviteCode }).first();
}

// POST /api/events/:inviteCode/expenses
router.post('/', requireMemberToken, async (req: Request, res: Response) => {
  const { description, amount_cents, paid_by, split_type, participants } = req.body;

  if (!description || amount_cents == null || !paid_by || !split_type || !participants?.length) {
    res.status(400).json({ error: 'description, amount_cents, paid_by, split_type, participants required' });
    return;
  }

  const event = await getEvent(req.params.inviteCode as string);
  if (!event) { res.status(404).json({ error: 'Event not found' }); return; }

  const caller = res.locals.member;
  if (caller.event_id !== event.id) {
    res.status(403).json({ error: 'Not a member of this event' });
    return;
  }

  let splits;
  try {
    splits = computeSplit(Number(amount_cents), split_type as SplitType, participants);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
    return;
  }

  await db.transaction(async (trx) => {
    const [expense] = await trx('expenses')
      .insert({
        event_id: event.id,
        description,
        amount_cents: Number(amount_cents),
        paid_by,
        created_by: caller.id,
        split_type,
      })
      .returning('*');

    await trx('expense_splits').insert(
      splits.map((s) => ({
        expense_id: expense.id,
        member_id: s.memberId,
        share_value: participants.find((p: any) => p.memberId === s.memberId)?.shareValue ?? 1,
        amount_cents: s.amountCents,
      }))
    );

    res.status(201).json(expense);
  });
});

// PUT /api/expenses/:id
router.put('/:id', requireMemberToken, async (req: Request, res: Response) => {
  const expense = await db('expenses').where({ id: req.params.id }).first();
  if (!expense) { res.status(404).json({ error: 'Expense not found' }); return; }

  if (expense.created_by !== res.locals.member.id) {
    res.status(403).json({ error: 'Only the creator can edit this expense' });
    return;
  }

  const { description, amount_cents, split_type, participants } = req.body;
  const newAmount = amount_cents != null ? Number(amount_cents) : expense.amount_cents;
  const newSplitType: SplitType = split_type ?? expense.split_type;

  await db.transaction(async (trx) => {
    const [updated] = await trx('expenses')
      .where({ id: expense.id })
      .update({
        description: description ?? expense.description,
        amount_cents: newAmount,
        split_type: newSplitType,
      })
      .returning('*');

    if (participants?.length) {
      let splits;
      try {
        splits = computeSplit(newAmount, newSplitType, participants);
      } catch (err: any) {
        res.status(400).json({ error: err.message });
        return;
      }
      await trx('expense_splits').where({ expense_id: expense.id }).delete();
      await trx('expense_splits').insert(
        splits.map((s) => ({
          expense_id: expense.id,
          member_id: s.memberId,
          share_value: participants.find((p: any) => p.memberId === s.memberId)?.shareValue ?? 1,
          amount_cents: s.amountCents,
        }))
      );
    }

    res.json(updated);
  });
});

// DELETE /api/expenses/:id
router.delete('/:id', requireMemberToken, async (req: Request, res: Response) => {
  const expense = await db('expenses').where({ id: req.params.id }).first();
  if (!expense) { res.status(404).json({ error: 'Expense not found' }); return; }

  if (expense.created_by !== res.locals.member.id) {
    res.status(403).json({ error: 'Only the creator can delete this expense' });
    return;
  }

  await db('expenses').where({ id: expense.id }).delete();
  res.status(204).send();
});

export default router;
