import express from 'express';
import cors from 'cors';
import * as dotenv from 'dotenv';
dotenv.config();

import eventsRouter from './routes/events';
import membersRouter from './routes/members';
import expensesRouter from './routes/expenses';
import settlementsRouter from './routes/settlements';

const app = express();
app.use(cors());
app.use(express.json());

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
