# Cat — Shared Cost Splitter: Design Spec

**Date:** 2026-06-17  
**Stack:** Node.js + Express + PostgreSQL (Knex) + TypeScript  
**Scope:** Backend only (v1) — data model, REST API, three core calculation functions

---

## What It Is

A mobile-first web app for splitting shared costs among a group during an event (trip, dinner, party). Low-friction joining via a shareable link, anyone can log an expense, and one clean settlement summary at the end.

---

## Data Model

### `events`
| column | type | notes |
|--------|------|-------|
| id | uuid PK | |
| name | text | display name |
| code | text UNIQUE | short slug used in share link (e.g. `trip-rome-x7k2`) |
| created_at | timestamptz | |

### `participants`
| column | type | notes |
|--------|------|-------|
| id | uuid PK | |
| event_id | uuid FK → events | |
| name | text | |
| photo_url | text | nullable |
| device_token | uuid UNIQUE | issued on join, stored in localStorage, used as identity |
| joined_at | timestamptz | |

### `expenses`
| column | type | notes |
|--------|------|-------|
| id | uuid PK | |
| event_id | uuid FK → events | |
| paid_by | uuid FK → participants | |
| amount | numeric(10,2) | |
| label | text | e.g. "Dinner", "Taxi" |
| split_type | enum('even','percentage','shares') | |
| created_at | timestamptz | |

### `expense_splits`
| column | type | notes |
|--------|------|-------|
| id | uuid PK | |
| expense_id | uuid FK → expenses | |
| participant_id | uuid FK → participants | |
| amount | numeric(10,2) | computed and stored on write |

### `settlements`
| column | type | notes |
|--------|------|-------|
| id | uuid PK | |
| event_id | uuid FK → events | |
| from_id | uuid FK → participants | |
| to_id | uuid FK → participants | |
| amount | numeric(10,2) | |
| recorded_at | timestamptz | |

---

## API Routes

All write routes require `X-Device-Token: <uuid>` header for identity.

```
POST   /events                          create event
GET    /events/:code                    get event + participants

POST   /events/:code/join               join event → returns device_token
GET    /events/:code/participants       list participants

POST   /events/:code/expenses           log expense
GET    /events/:code/expenses           list expenses with splits
PUT    /events/:code/expenses/:id       edit (owner only)
DELETE /events/:code/expenses/:id       delete (owner only)

GET    /events/:code/settlement         compute + return minimal payment list
POST   /events/:code/settlements        record a settlement (informational)
```

---

## The Three Core Functions

### 1. `splitExpense(amount, splitType, participants, overrides?)`
Computes each participant's share. Returns `{ participantId: amount }`.
- **even**: divide equally, distribute rounding remainder to first participant
- **percentage**: overrides contains percentages that must sum to 100
- **shares**: overrides contains share counts; each person gets `(shares/total) * amount`

### 2. `computeBalances(eventId)`
For each participant: `balance = totalPaid - totalOwed`
- Positive balance → others owe them
- Negative balance → they owe others
- Queries `expenses.amount` (paid) and `expense_splits.amount` (owed)

### 3. `simplifyDebts(balances)`
Turns the net balances map into the minimal list of payments.
- Separate participants into creditors (positive) and debtors (negative)
- Greedily match largest debtor to largest creditor
- Each iteration: `payment = min(|debtor|, creditor)`, emit, reduce both, repeat
- Result: at most N-1 transactions for N participants

---

## Identity & Security

- `device_token` is a UUID issued once at join time, returned to the client, stored in localStorage
- Passed as `X-Device-Token` header on all write requests
- Backend verifies the token belongs to the participant who owns the resource before any edit/delete
- No passwords, no JWTs, no sessions — intentionally minimal for v1

---

## Project Structure

```
cat/
├── src/
│   ├── index.ts              entry point
│   ├── db/
│   │   ├── knex.ts           knex instance
│   │   └── migrations/       all migrations
│   ├── routes/
│   │   ├── events.ts
│   │   ├── participants.ts
│   │   ├── expenses.ts
│   │   └── settlements.ts
│   ├── lib/
│   │   ├── splitExpense.ts   pure function
│   │   ├── computeBalances.ts pure function
│   │   └── simplifyDebts.ts  pure function
│   └── middleware/
│       └── auth.ts           device token verification
├── package.json
├── tsconfig.json
└── .env
```

---

## Deliberately Out of Scope (v1)

- Real payment processing
- Multiple currencies
- Password/email accounts
- Push notifications
