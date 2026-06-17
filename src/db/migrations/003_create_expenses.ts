import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('expenses', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('event_id').notNullable().references('id').inTable('events').onDelete('CASCADE');
    t.text('description').notNullable();
    t.integer('amount_cents').notNullable();
    t.uuid('paid_by').notNullable().references('id').inTable('members').onDelete('CASCADE');
    t.uuid('created_by').notNullable().references('id').inTable('members').onDelete('CASCADE');
    t.text('split_type').notNullable().defaultTo('equal');
    t.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('expenses');
}
