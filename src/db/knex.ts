import Knex from 'knex';
import * as dotenv from 'dotenv';
dotenv.config();

const db = Knex({
  client: 'pg',
  connection: process.env.DATABASE_URL,
});

export default db;
