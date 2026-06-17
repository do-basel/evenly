import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('members', (t) => {
    t.uuid('user_id').nullable().references('id').inTable('users').onDelete('SET NULL');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('members', (t) => {
    t.dropColumn('user_id');
  });
}
