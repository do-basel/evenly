import Knex from 'knex';

const isProduction = process.env.NODE_ENV === 'production';

const db = Knex({
  client: 'pg',
  connection: isProduction
    ? { connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } }
    : process.env.DATABASE_URL,
});

export default db;
