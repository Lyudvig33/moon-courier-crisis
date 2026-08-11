import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBaseEntityTimestamps1710000000001 implements MigrationInterface {
  name = 'AddBaseEntityTimestamps1710000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const tables = [
      'zones',
      'routes',
      'rovers',
      'orders',
      'deliveries',
      'game_events',
      'game_sessions',
    ];

    for (const table of tables) {
      await queryRunner.query(`
        ALTER TABLE "${table}"
        ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
      `);

      await queryRunner.query(`
        ALTER TABLE "${table}"
        ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
      `);
    }
  }

  public async down(): Promise<void> {
    // Dropping columns is intentionally omitted; reverting migrations is not required here.
  }
}
