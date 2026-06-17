# Cat Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Node/Express/PostgreSQL backend for Cat — a shared cost splitting app with link-based joining, expense logging, and debt simplification.

**Architecture:** REST API with Express + TypeScript. Knex for migrations and query building (raw SQL style). Three pure calculation functions (split, balance, simplify) are isolated in `src/lib/` and tested independently of the database. Identity is a UUID device token issued on join, passed in `X-Device-Token` header.

**Tech Stack:** Node.js 20, TypeScript, Express 4, Knex 3, pg, uuid, jest, ts-jest

---

## File Map

| File | Responsibility |
|------|---------------|
| `src/index.ts` | Express app bootstrap, route wiring |
| `src/db/knex.ts` | Single Knex instance |
| `src/db/migrations/001_create_events.ts` | events table |
| `src/db/migrations/002_create_participants.ts` | participants table |
| `src/db/migrations/003_create_expenses.ts` | expenses + split_type enum |
| `src/db/migrations/004_create_expense_splits.ts` | expense_splits table |
| `src/db/migrations/005_create_settlements.ts` | settlements table |
| `src/lib/splitExpense.ts` | Pure: compute each participant's share |
| `src/lib/computeBalances.ts` | Pure: net balance per participant from DB rows |
| `src/lib/simplifyDebts.ts` | Pure: minimal payment list from balances |
| `src/middleware/auth.ts` | Verify X-Device-Token header |
| `src/routes/events.ts` | POST /events, GET /events/:code |
| `src/routes/participants.ts` | POST /events/:code/join, GET /events/:code/participants |
| `src/routes/expenses.ts` | CRUD for expenses |
| `src/routes/settlements.ts` | GET settlement, POST record settlement |
| `tests/lib/splitExpense.test.ts` | Unit tests |
| `tests/lib/computeBalances.test.ts` | Unit tests |
| `tests/lib/simplifyDebts.test.ts` | Unit tests |

---

### Task 1: Project setup

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `.env.example`
- Create: `knexfile.ts`

- [ ] **Step 1: Initialise project**

```bash
cd /Users/basiladdoghayem/projects/cat
npm init -y
```

- [ ] **Step 2: Install dependencies**

```bash
npm install express knex pg uuid
npm install --save-dev typescript ts-node @types/express @types/node @types/uuid jest ts-jest @types/jest
```

- [ ] **Step 3: Write `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "skipLibCheck": true
  },
  "include": ["src", "knexfile.ts"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

- [ ] **Step 4: Update `package.json` scripts**

Replace the `"scripts"` section:

```json
"scripts": {
  "dev": "ts-node src/index.ts",
  "build": "tsc",
  "test": "jest",
  "migrate": "knex --knexfile knexfile.ts migrate:latest",
  "migrate:rollback": "knex --knexfile knexfile.ts migrate:rollback"
},
"jest": {
  "preset": "ts-jest",
  "testEnvironment": "node",
  "roots": ["<rootDir>/tests"]
}
```

- [ ] **Step 5: Write `knexfile.ts`**

```typescript
import type { Knex } from 'knex';
import * as dotenv from 'dotenv';
dotenv.config();

const config: { [key: string]: Knex.Config } = {
  development: {
    client: 'pg',
    connection: process.env.DATABASE_URL,
    migrations: {
      directory: './src/db/migrations',
      extension: 'ts',
    },
  },
};

export default config;
```

- [ ] **Step 6: Write `.env.example`**

```
DATABASE_URL=postgres://postgres:password@localhost:5432/cat
PORT=3000
```

- [ ] **Step 7: Copy to `.env` and fill in your local Postgres URL**

```bash
cp .env.example .env
```

- [ ] **Step 8: Write `src/db/knex.ts`**

```typescript
import Knex from 'knex';
import * as dotenv from 'dotenv';
dotenv.config();

const db = Knex({
  client: 'pg',
  connection: process.env.DATABASE_URL,
});

export default db;
```

- [ ] **Step 9: Create the Postgres database**

```bash
createdb cat
```

- [ ] **Step 10: Commit**

```bash
git init
git add -A
git commit -m "feat: project setup — express, knex, ts, jest"
```

---

### Task 2: Database migrations

**Files:**
- Create: `src/db/migrations/001_create_events.ts`
- Create: `src/db/migrations/002_create_participants.ts`
- Create: `src/db/migrations/003_create_expenses.ts`
- Create: `src/db/migrations/004_create_expense_splits.ts`
- Create: `src/db/migrations/005_create_settlements.ts`

- [ ] **Step 1: Create migrations directory**

```bash
mkdir -p src/db/migrations
```

- [ ] **Step 2: Write `001_create_events.ts`**

```typescript
import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('events', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.text('name').notNullable();
    t.text('code').notNullable().unique();
    t.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('events');
}
```

- [ ] **Step 3: Write `002_create_participants.ts`**

```typescript
import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('participants', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('event_id').notNullable().references('id').inTable('events').onDelete('CASCADE');
    t.text('name').notNullable();
    t.text('photo_url').nullable();
    t.uuid('device_token').notNullable().unique().defaultTo(knex.raw('gen_random_uuid()'));
    t.timestamp('joined_at', { useTz: true }).defaultTo(knex.fn.now());
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('participants');
}
```

- [ ] **Step 4: Write `003_create_expenses.ts`**

```typescript
import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.raw(`CREATE TYPE split_type AS ENUM ('even', 'percentage', 'shares')`);
  await knex.schema.createTable('expenses', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('event_id').notNullable().references('id').inTable('events').onDelete('CASCADE');
    t.uuid('paid_by').notNullable().references('id').inTable('participants').onDelete('CASCADE');
    t.decimal('amount', 10, 2).notNullable();
    t.text('label').notNullable();
    t.specificType('split_type', 'split_type').notNullable().defaultTo('even');
    t.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('expenses');
  await knex.raw(`DROP TYPE split_type`);
}
```

- [ ] **Step 5: Write `004_create_expense_splits.ts`**

```typescript
import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('expense_splits', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('expense_id').notNullable().references('id').inTable('expenses').onDelete('CASCADE');
    t.uuid('participant_id').notNullable().references('id').inTable('participants').onDelete('CASCADE');
    t.decimal('amount', 10, 2).notNullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('expense_splits');
}
```

- [ ] **Step 6: Write `005_create_settlements.ts`**

```typescript
import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('settlements', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('event_id').notNullable().references('id').inTable('events').onDelete('CASCADE');
    t.uuid('from_id').notNullable().references('id').inTable('participants').onDelete('CASCADE');
    t.uuid('to_id').notNullable().references('id').inTable('participants').onDelete('CASCADE');
    t.decimal('amount', 10, 2).notNullable();
    t.timestamp('recorded_at', { useTz: true }).defaultTo(knex.fn.now());
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('settlements');
}
```

- [ ] **Step 7: Run migrations**

```bash
npm run migrate
```

Expected output: `Batch 1 run: 5 migrations`

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: database migrations — all 5 tables"
```

---

### Task 3: `splitExpense` pure function

**Files:**
- Create: `src/lib/splitExpense.ts`
- Create: `tests/lib/splitExpense.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// tests/lib/splitExpense.test.ts
import { splitExpense } from '../../src/lib/splitExpense';

describe('splitExpense', () => {
  const participants = ['alice', 'bob', 'charlie'];

  describe('even split', () => {
    it('divides equally', () => {
      const result = splitExpense(30, 'even', participants);
      expect(result).toEqual({ alice: 10, bob: 10, charlie: 10 });
    });

    it('handles rounding by adding remainder to first participant', () => {
      const result = splitExpense(10, 'even', participants);
      expect(result['alice'] + result['bob'] + result['charlie']).toBeCloseTo(10, 2);
      const values = Object.values(result);
      const sum = values.reduce((a, b) => a + b, 0);
      expect(Math.round(sum * 100) / 100).toBe(10);
    });
  });

  describe('percentage split', () => {
    it('splits by percentage', () => {
      const result = splitExpense(100, 'percentage', participants, {
        alice: 50, bob: 30, charlie: 20,
      });
      expect(result).toEqual({ alice: 50, bob: 30, charlie: 20 });
    });

    it('throws if percentages do not sum to 100', () => {
      expect(() =>
        splitExpense(100, 'percentage', participants, { alice: 50, bob: 30, charlie: 10 })
      ).toThrow('Percentages must sum to 100');
    });
  });

  describe('shares split', () => {
    it('splits by share count', () => {
      const result = splitExpense(60, 'shares', participants, {
        alice: 1, bob: 2, charlie: 3,
      });
      expect(result).toEqual({ alice: 10, bob: 20, charlie: 30 });
    });
  });
});
```

- [ ] **Step 2: Run to verify failure**

```bash
npm test -- tests/lib/splitExpense.test.ts
```

Expected: FAIL — `Cannot find module '../../src/lib/splitExpense'`

- [ ] **Step 3: Implement `splitExpense.ts`**

```typescript
// src/lib/splitExpense.ts
export type SplitType = 'even' | 'percentage' | 'shares';

export function splitExpense(
  amount: number,
  splitType: SplitType,
  participants: string[],
  overrides?: Record<string, number>
): Record<string, number> {
  if (splitType === 'even') {
    const base = Math.floor((amount * 100) / participants.length) / 100;
    const remainder = Math.round((amount - base * participants.length) * 100) / 100;
    return Object.fromEntries(
      participants.map((p, i) => [p, i === 0 ? base + remainder : base])
    );
  }

  if (splitType === 'percentage') {
    if (!overrides) throw new Error('Percentages required');
    const total = Object.values(overrides).reduce((a, b) => a + b, 0);
    if (Math.round(total) !== 100) throw new Error('Percentages must sum to 100');
    return Object.fromEntries(
      participants.map((p) => [p, Math.round((overrides[p] / 100) * amount * 100) / 100])
    );
  }

  if (splitType === 'shares') {
    if (!overrides) throw new Error('Shares required');
    const totalShares = Object.values(overrides).reduce((a, b) => a + b, 0);
    return Object.fromEntries(
      participants.map((p) => [p, Math.round((overrides[p] / totalShares) * amount * 100) / 100])
    );
  }

  throw new Error(`Unknown split type: ${splitType}`);
}
```

- [ ] **Step 4: Run tests — expect pass**

```bash
npm test -- tests/lib/splitExpense.test.ts
```

Expected: PASS (all tests green)

- [ ] **Step 5: Commit**

```bash
git add src/lib/splitExpense.ts tests/lib/splitExpense.test.ts
git commit -m "feat: splitExpense pure function with tests"
```

---

### Task 4: `computeBalances` pure function

**Files:**
- Create: `src/lib/computeBalances.ts`
- Create: `tests/lib/computeBalances.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// tests/lib/computeBalances.test.ts
import { computeBalances, ExpenseRow, SplitRow } from '../../src/lib/computeBalances';

describe('computeBalances', () => {
  it('returns zero balance for each participant when no expenses', () => {
    const result = computeBalances([], []);
    expect(result).toEqual({});
  });

  it('payer has positive balance equal to others shares', () => {
    const expenses: ExpenseRow[] = [
      { id: 'e1', paid_by: 'alice', amount: 30 },
    ];
    const splits: SplitRow[] = [
      { expense_id: 'e1', participant_id: 'alice', amount: 10 },
      { expense_id: 'e1', participant_id: 'bob', amount: 10 },
      { expense_id: 'e1', participant_id: 'charlie', amount: 10 },
    ];
    const result = computeBalances(expenses, splits);
    expect(result['alice']).toBeCloseTo(20, 2);   // paid 30, owes 10
    expect(result['bob']).toBeCloseTo(-10, 2);     // paid 0, owes 10
    expect(result['charlie']).toBeCloseTo(-10, 2); // paid 0, owes 10
  });

  it('handles multiple expenses', () => {
    const expenses: ExpenseRow[] = [
      { id: 'e1', paid_by: 'alice', amount: 60 },
      { id: 'e2', paid_by: 'bob', amount: 30 },
    ];
    const splits: SplitRow[] = [
      { expense_id: 'e1', participant_id: 'alice', amount: 30 },
      { expense_id: 'e1', participant_id: 'bob', amount: 30 },
      { expense_id: 'e2', participant_id: 'alice', amount: 15 },
      { expense_id: 'e2', participant_id: 'bob', amount: 15 },
    ];
    const result = computeBalances(expenses, splits);
    expect(result['alice']).toBeCloseTo(15, 2);  // paid 60, owes 45
    expect(result['bob']).toBeCloseTo(-15, 2);   // paid 30, owes 45
  });
});
```

- [ ] **Step 2: Run to verify failure**

```bash
npm test -- tests/lib/computeBalances.test.ts
```

Expected: FAIL — module not found

- [ ] **Step 3: Implement `computeBalances.ts`**

```typescript
// src/lib/computeBalances.ts
export interface ExpenseRow {
  id: string;
  paid_by: string;
  amount: number;
}

export interface SplitRow {
  expense_id: string;
  participant_id: string;
  amount: number;
}

export function computeBalances(
  expenses: ExpenseRow[],
  splits: SplitRow[]
): Record<string, number> {
  const balances: Record<string, number> = {};

  for (const expense of expenses) {
    balances[expense.paid_by] = (balances[expense.paid_by] ?? 0) + Number(expense.amount);
  }

  for (const split of splits) {
    balances[split.participant_id] =
      (balances[split.participant_id] ?? 0) - Number(split.amount);
  }

  return balances;
}
```

- [ ] **Step 4: Run tests — expect pass**

```bash
npm test -- tests/lib/computeBalances.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/computeBalances.ts tests/lib/computeBalances.test.ts
git commit -m "feat: computeBalances pure function with tests"
```

---

### Task 5: `simplifyDebts` pure function

**Files:**
- Create: `src/lib/simplifyDebts.ts`
- Create: `tests/lib/simplifyDebts.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// tests/lib/simplifyDebts.test.ts
import { simplifyDebts, Payment } from '../../src/lib/simplifyDebts';

describe('simplifyDebts', () => {
  it('returns empty list when all balances are zero', () => {
    expect(simplifyDebts({})).toEqual([]);
  });

  it('produces single payment for two people', () => {
    const result = simplifyDebts({ alice: 10, bob: -10 });
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ from: 'bob', to: 'alice', amount: 10 });
  });

  it('simplifies three-way debt into minimal payments', () => {
    // alice: +20, bob: -10, charlie: -10
    const result = simplifyDebts({ alice: 20, bob: -10, charlie: -10 });
    expect(result).toHaveLength(2);
    const total = result.reduce((sum, p) => sum + p.amount, 0);
    expect(total).toBeCloseTo(20, 2);
    result.forEach((p) => expect(p.to).toBe('alice'));
  });

  it('reduces circular debt (alice→bob→charlie→alice) to fewer payments', () => {
    // alice paid +10, bob paid +0, charlie paid +0; all owe each other equally
    const result = simplifyDebts({ alice: 20, bob: -10, charlie: -10 });
    expect(result.length).toBeLessThanOrEqual(2);
  });

  it('the payments sum correctly to net out all balances', () => {
    const balances = { alice: 15, bob: -5, charlie: -7, dave: -3 };
    const result = simplifyDebts(balances);
    const check: Record<string, number> = {};
    for (const p of result) {
      check[p.from] = (check[p.from] ?? 0) - p.amount;
      check[p.to] = (check[p.to] ?? 0) + p.amount;
    }
    for (const [person, balance] of Object.entries(balances)) {
      expect((check[person] ?? 0)).toBeCloseTo(balance, 2);
    }
  });
});
```

- [ ] **Step 2: Run to verify failure**

```bash
npm test -- tests/lib/simplifyDebts.test.ts
```

Expected: FAIL — module not found

- [ ] **Step 3: Implement `simplifyDebts.ts`**

```typescript
// src/lib/simplifyDebts.ts
export interface Payment {
  from: string;
  to: string;
  amount: number;
}

export function simplifyDebts(balances: Record<string, number>): Payment[] {
  const payments: Payment[] = [];

  const creditors = Object.entries(balances)
    .filter(([, b]) => b > 0.005)
    .map(([id, b]) => ({ id, amount: b }))
    .sort((a, b) => b.amount - a.amount);

  const debtors = Object.entries(balances)
    .filter(([, b]) => b < -0.005)
    .map(([id, b]) => ({ id, amount: -b }))
    .sort((a, b) => b.amount - a.amount);

  let ci = 0;
  let di = 0;

  while (ci < creditors.length && di < debtors.length) {
    const creditor = creditors[ci];
    const debtor = debtors[di];
    const payment = Math.min(creditor.amount, debtor.amount);

    payments.push({
      from: debtor.id,
      to: creditor.id,
      amount: Math.round(payment * 100) / 100,
    });

    creditor.amount -= payment;
    debtor.amount -= payment;

    if (creditor.amount < 0.005) ci++;
    if (debtor.amount < 0.005) di++;
  }

  return payments;
}
```

- [ ] **Step 4: Run tests — expect pass**

```bash
npm test -- tests/lib/simplifyDebts.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/simplifyDebts.ts tests/lib/simplifyDebts.test.ts
git commit -m "feat: simplifyDebts pure function with tests"
```

---

### Task 6: Auth middleware

**Files:**
- Create: `src/middleware/auth.ts`

- [ ] **Step 1: Write `src/middleware/auth.ts`**

```typescript
import { Request, Response, NextFunction } from 'express';
import db from '../db/knex';

export async function requireDeviceToken(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const token = req.headers['x-device-token'];
  if (!token || typeof token !== 'string') {
    res.status(401).json({ error: 'Missing X-Device-Token header' });
    return;
  }

  const participant = await db('participants').where({ device_token: token }).first();
  if (!participant) {
    res.status(401).json({ error: 'Invalid device token' });
    return;
  }

  res.locals.participant = participant;
  next();
}
```

- [ ] **Step 2: Commit**

```bash
git add src/middleware/auth.ts
git commit -m "feat: device token auth middleware"
```

---

### Task 7: Events routes

**Files:**
- Create: `src/routes/events.ts`

- [ ] **Step 1: Write `src/routes/events.ts`**

```typescript
import { Router, Request, Response } from 'express';
import db from '../db/knex';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// POST /events — create a new event
router.post('/', async (req: Request, res: Response) => {
  const { name } = req.body;
  if (!name || typeof name !== 'string') {
    res.status(400).json({ error: 'name is required' });
    return;
  }

  const code = uuidv4().split('-')[0] + '-' + uuidv4().split('-')[0];

  const [event] = await db('events').insert({ name, code }).returning('*');
  res.status(201).json({ id: event.id, name: event.name, code: event.code });
});

// GET /events/:code — get event with participants
router.get('/:code', async (req: Request, res: Response) => {
  const event = await db('events').where({ code: req.params.code }).first();
  if (!event) {
    res.status(404).json({ error: 'Event not found' });
    return;
  }

  const participants = await db('participants')
    .where({ event_id: event.id })
    .select('id', 'name', 'photo_url', 'joined_at');

  res.json({ ...event, participants });
});

export default router;
```

- [ ] **Step 2: Commit**

```bash
git add src/routes/events.ts
git commit -m "feat: events routes (create, get)"
```

---

### Task 8: Participants routes

**Files:**
- Create: `src/routes/participants.ts`

- [ ] **Step 1: Write `src/routes/participants.ts`**

```typescript
import { Router, Request, Response } from 'express';
import db from '../db/knex';

const router = Router({ mergeParams: true });

// POST /events/:code/join
router.post('/join', async (req: Request, res: Response) => {
  const { name, photo_url } = req.body;
  if (!name || typeof name !== 'string') {
    res.status(400).json({ error: 'name is required' });
    return;
  }

  const event = await db('events').where({ code: req.params.code }).first();
  if (!event) {
    res.status(404).json({ error: 'Event not found' });
    return;
  }

  const [participant] = await db('participants')
    .insert({ event_id: event.id, name, photo_url: photo_url ?? null })
    .returning('*');

  res.status(201).json({
    id: participant.id,
    name: participant.name,
    photo_url: participant.photo_url,
    device_token: participant.device_token,
  });
});

// GET /events/:code/participants
router.get('/', async (req: Request, res: Response) => {
  const event = await db('events').where({ code: req.params.code }).first();
  if (!event) {
    res.status(404).json({ error: 'Event not found' });
    return;
  }

  const participants = await db('participants')
    .where({ event_id: event.id })
    .select('id', 'name', 'photo_url', 'joined_at');

  res.json(participants);
});

export default router;
```

- [ ] **Step 2: Commit**

```bash
git add src/routes/participants.ts
git commit -m "feat: participants routes (join, list)"
```

---

### Task 9: Expenses routes

**Files:**
- Create: `src/routes/expenses.ts`

- [ ] **Step 1: Write `src/routes/expenses.ts`**

```typescript
import { Router, Request, Response } from 'express';
import db from '../db/knex';
import { requireDeviceToken } from '../middleware/auth';
import { splitExpense, SplitType } from '../lib/splitExpense';

const router = Router({ mergeParams: true });

async function getEvent(code: string) {
  return db('events').where({ code }).first();
}

// POST /events/:code/expenses
router.post('/', requireDeviceToken, async (req: Request, res: Response) => {
  const { amount, label, split_type, participant_ids, overrides } = req.body;

  if (!amount || !label || !split_type || !participant_ids?.length) {
    res.status(400).json({ error: 'amount, label, split_type, participant_ids required' });
    return;
  }

  const event = await getEvent(req.params.code);
  if (!event) { res.status(404).json({ error: 'Event not found' }); return; }

  const payer = res.locals.participant;
  if (payer.event_id !== event.id) {
    res.status(403).json({ error: 'Participant not in this event' });
    return;
  }

  const shares = splitExpense(Number(amount), split_type as SplitType, participant_ids, overrides);

  await db.transaction(async (trx) => {
    const [expense] = await trx('expenses')
      .insert({ event_id: event.id, paid_by: payer.id, amount, label, split_type })
      .returning('*');

    const splitRows = participant_ids.map((pid: string) => ({
      expense_id: expense.id,
      participant_id: pid,
      amount: shares[pid],
    }));
    await trx('expense_splits').insert(splitRows);

    res.status(201).json(expense);
  });
});

// GET /events/:code/expenses
router.get('/', async (req: Request, res: Response) => {
  const event = await getEvent(req.params.code);
  if (!event) { res.status(404).json({ error: 'Event not found' }); return; }

  const expenses = await db('expenses').where({ event_id: event.id }).orderBy('created_at', 'asc');

  const splits = await db('expense_splits')
    .whereIn('expense_id', expenses.map((e) => e.id));

  const result = expenses.map((e) => ({
    ...e,
    splits: splits.filter((s) => s.expense_id === e.id),
  }));

  res.json(result);
});

// PUT /events/:code/expenses/:id
router.put('/:id', requireDeviceToken, async (req: Request, res: Response) => {
  const event = await getEvent(req.params.code);
  if (!event) { res.status(404).json({ error: 'Event not found' }); return; }

  const expense = await db('expenses').where({ id: req.params.id, event_id: event.id }).first();
  if (!expense) { res.status(404).json({ error: 'Expense not found' }); return; }

  if (expense.paid_by !== res.locals.participant.id) {
    res.status(403).json({ error: 'Only the payer can edit this expense' });
    return;
  }

  const { amount, label, split_type, participant_ids, overrides } = req.body;
  const newAmount = amount ?? expense.amount;
  const newSplitType = (split_type ?? expense.split_type) as SplitType;
  const newParticipants = participant_ids;

  await db.transaction(async (trx) => {
    const [updated] = await trx('expenses')
      .where({ id: expense.id })
      .update({ amount: newAmount, label: label ?? expense.label, split_type: newSplitType })
      .returning('*');

    if (newParticipants) {
      const shares = splitExpense(Number(newAmount), newSplitType, newParticipants, overrides);
      await trx('expense_splits').where({ expense_id: expense.id }).delete();
      await trx('expense_splits').insert(
        newParticipants.map((pid: string) => ({
          expense_id: expense.id,
          participant_id: pid,
          amount: shares[pid],
        }))
      );
    }

    res.json(updated);
  });
});

// DELETE /events/:code/expenses/:id
router.delete('/:id', requireDeviceToken, async (req: Request, res: Response) => {
  const event = await getEvent(req.params.code);
  if (!event) { res.status(404).json({ error: 'Event not found' }); return; }

  const expense = await db('expenses').where({ id: req.params.id, event_id: event.id }).first();
  if (!expense) { res.status(404).json({ error: 'Expense not found' }); return; }

  if (expense.paid_by !== res.locals.participant.id) {
    res.status(403).json({ error: 'Only the payer can delete this expense' });
    return;
  }

  await db('expenses').where({ id: expense.id }).delete();
  res.status(204).send();
});

export default router;
```

- [ ] **Step 2: Commit**

```bash
git add src/routes/expenses.ts
git commit -m "feat: expenses routes (CRUD with auth)"
```

---

### Task 10: Settlement routes

**Files:**
- Create: `src/routes/settlements.ts`

- [ ] **Step 1: Write `src/routes/settlements.ts`**

```typescript
import { Router, Request, Response } from 'express';
import db from '../db/knex';
import { requireDeviceToken } from '../middleware/auth';
import { computeBalances } from '../lib/computeBalances';
import { simplifyDebts } from '../lib/simplifyDebts';

const router = Router({ mergeParams: true });

// GET /events/:code/settlement — run reconciliation
router.get('/', async (req: Request, res: Response) => {
  const event = await db('events').where({ code: req.params.code }).first();
  if (!event) { res.status(404).json({ error: 'Event not found' }); return; }

  const expenses = await db('expenses').where({ event_id: event.id });
  const splits = await db('expense_splits')
    .whereIn('expense_id', expenses.map((e) => e.id));

  const balances = computeBalances(expenses, splits);
  const payments = simplifyDebts(balances);

  // Enrich with participant names
  const participants = await db('participants')
    .where({ event_id: event.id })
    .select('id', 'name');
  const nameMap: Record<string, string> = {};
  for (const p of participants) nameMap[p.id] = p.name;

  const result = payments.map((p) => ({
    from: nameMap[p.from] ?? p.from,
    from_id: p.from,
    to: nameMap[p.to] ?? p.to,
    to_id: p.to,
    amount: p.amount,
  }));

  res.json(result);
});

// POST /events/:code/settlements — record a settlement
router.post('/', requireDeviceToken, async (req: Request, res: Response) => {
  const { to_id, amount } = req.body;
  if (!to_id || !amount) {
    res.status(400).json({ error: 'to_id and amount required' });
    return;
  }

  const event = await db('events').where({ code: req.params.code }).first();
  if (!event) { res.status(404).json({ error: 'Event not found' }); return; }

  const [settlement] = await db('settlements')
    .insert({
      event_id: event.id,
      from_id: res.locals.participant.id,
      to_id,
      amount,
    })
    .returning('*');

  res.status(201).json(settlement);
});

export default router;
```

- [ ] **Step 2: Commit**

```bash
git add src/routes/settlements.ts
git commit -m "feat: settlement routes (compute + record)"
```

---

### Task 11: Wire everything in index.ts

**Files:**
- Create: `src/index.ts`

- [ ] **Step 1: Write `src/index.ts`**

```typescript
import express from 'express';
import * as dotenv from 'dotenv';
dotenv.config();

import eventsRouter from './routes/events';
import participantsRouter from './routes/participants';
import expensesRouter from './routes/expenses';
import settlementsRouter from './routes/settlements';

const app = express();
app.use(express.json());

app.use('/events', eventsRouter);
app.use('/events/:code/participants', participantsRouter);
app.use('/events/:code/expenses', expensesRouter);
app.use('/events/:code/settlements', settlementsRouter);

const PORT = process.env.PORT ?? 3000;
app.listen(PORT, () => {
  console.log(`Cat backend running on port ${PORT}`);
});

export default app;
```

- [ ] **Step 2: Start the server**

```bash
npm run dev
```

Expected: `Cat backend running on port 3000`

- [ ] **Step 3: Smoke test — create an event**

```bash
curl -s -X POST http://localhost:3000/events \
  -H "Content-Type: application/json" \
  -d '{"name": "Trip to Riyadh"}' | jq .
```

Expected: `{ "id": "...", "name": "Trip to Riyadh", "code": "..." }`

- [ ] **Step 4: Smoke test — join the event**

```bash
# Replace <code> with the code from step 3
curl -s -X POST http://localhost:3000/events/<code>/join \
  -H "Content-Type: application/json" \
  -d '{"name": "Alice"}' | jq .
```

Expected: `{ "id": "...", "name": "Alice", "device_token": "..." }`

- [ ] **Step 5: Run all tests**

```bash
npm test
```

Expected: All tests pass.

- [ ] **Step 6: Final commit**

```bash
git add src/index.ts
git commit -m "feat: wire all routes in index.ts — backend complete"
```
