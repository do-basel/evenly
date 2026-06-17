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

// Run pending migrations on every startup so Railway deploys self-migrate
db.migrate.latest().then(() => {
  console.log('Migrations up to date');
}).catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});

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
