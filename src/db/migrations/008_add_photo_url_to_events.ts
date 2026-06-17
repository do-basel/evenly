import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.table('events', (t) => {
    t.text('photo_url').nullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.table('events', (t) => {
    t.dropColumn('photo_url');
  });
}
