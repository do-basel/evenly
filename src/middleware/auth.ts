import { Request, Response, NextFunction } from 'express';
import db from '../db/knex';

export async function requireMemberToken(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const token = req.headers['x-member-token'];
  if (!token || typeof token !== 'string') {
    res.status(401).json({ error: 'Missing X-Member-Token header' });
    return;
  }

  const member = await db('members').where({ member_token: token }).first();
  if (!member) {
    res.status(401).json({ error: 'Invalid member token' });
    return;
  }

  res.locals.member = member;
  next();
}
