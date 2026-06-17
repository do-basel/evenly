import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('expense_splits', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('expense_id').notNullable().references('id').inTable('expenses').onDelete('CASCADE');
    t.uuid('member_id').notNullable().references('id').inTable('members').onDelete('CASCADE');
    t.decimal('share_value', 10, 4).notNullable();
    t.integer('amount_cents').notNullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('expense_splits');
}
