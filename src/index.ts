import express from 'express';
import cors from 'cors';
import * as dotenv from 'dotenv';
dotenv.config();

import db from './db/knex';
import eventsRouter from './routes/events';
import membersRouter from './routes/members';
import expensesRouter from './routes/expenses';
import settlementsRouter from './routes/settlements';
import authRouter from './routes/auth';

// Apply additive schema changes that may not have been run via CLI
Promise.all([
  db.raw('ALTER TABLE events ADD COLUMN IF NOT EXISTS photo_url TEXT'),
  db.raw('ALTER TABLE expenses ADD COLUMN IF NOT EXISTS receipt_url TEXT'),
])
  .then(() => console.log('Schema ready'))
  .catch((err: Error) => console.warn('Schema patch skipped:', err.message));

const app = express();
app.use(cors());
app.use(express.json({ limit: '5mb' })); // allow photo uploads

app.use('/api/auth', authRouter);
app.use('/api/events', eventsRouter);
app.use('/api/events/:inviteCode/members', membersRouter);
app.use('/api/events/:inviteCode/expenses', expensesRouter);
app.use('/api/events/:inviteCode/settlements', settlementsRouter);
app.use('/api/expenses', expensesRouter);

const PORT = process.env.PORT ?? 3000;
app.listen(PORT, () => {
  console.log(`Evenly backend running on port ${PORT}`);
});

export default app;
