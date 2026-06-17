import Knex from 'knex';
import path from 'path';

const isProduction = process.env.NODE_ENV === 'production';

const db = Knex({
  client: 'pg',
  connection: isProduction
    ? { connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } }
    : process.env.DATABASE_URL,
  migrations: {
    directory: path.join(__dirname, 'migrations'),
    extension: isProduction ? 'js' : 'ts',
  },
});

export default db;
