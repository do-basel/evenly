import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('settlements', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('event_id').notNullable().references('id').inTable('events').onDelete('CASCADE');
    t.uuid('from_member_id').notNullable().references('id').inTable('members').onDelete('CASCADE');
    t.uuid('to_member_id').notNullable().references('id').inTable('members').onDelete('CASCADE');
    t.integer('amount_cents').notNullable();
    t.boolean('is_settled').notNullable().defaultTo(false);
    t.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('settlements');
}
