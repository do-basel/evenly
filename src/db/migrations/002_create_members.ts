import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('members', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('event_id').notNullable().references('id').inTable('events').onDelete('CASCADE');
    t.text('name').notNullable();
    t.text('photo_url').nullable();
    t.uuid('member_token').notNullable().unique().defaultTo(knex.raw('gen_random_uuid()'));
    t.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('members');
}
