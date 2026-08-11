import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitSchema1710000000000 implements MigrationInterface {
  name = 'InitSchema1710000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);

    await queryRunner.query(`
      CREATE TABLE "zones" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "name" varchar(100) NOT NULL,
        "x" double precision NOT NULL,
        "y" double precision NOT NULL,
        "terrain" varchar(30) NOT NULL,
        "risk_multiplier" double precision NOT NULL DEFAULT 1,
        "speed_multiplier" double precision NOT NULL DEFAULT 1
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "routes" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "from_zone_id" uuid NOT NULL REFERENCES "zones"("id") ON DELETE CASCADE,
        "to_zone_id" uuid NOT NULL REFERENCES "zones"("id") ON DELETE CASCADE,
        "distance" double precision NOT NULL,
        "base_risk" double precision NOT NULL
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "game_sessions" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "day" integer NOT NULL DEFAULT 1,
        "money" integer NOT NULL DEFAULT 500,
        "score" integer NOT NULL DEFAULT 0,
        "base_rating" integer NOT NULL DEFAULT 80,
        "status" varchar(20) NOT NULL DEFAULT 'ACTIVE',
        "lucky_signal_active" boolean NOT NULL DEFAULT false,
        "solar_storm_active" boolean NOT NULL DEFAULT false,
        "route_risk_bonus" double precision NOT NULL DEFAULT 0,
        "speed_modifier" double precision NOT NULL DEFAULT 1,
        "dust_storm_zone_id" varchar(36),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "rovers" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "game_session_id" uuid NOT NULL REFERENCES "game_sessions"("id") ON DELETE CASCADE,
        "name" varchar(100) NOT NULL,
        "battery" double precision NOT NULL DEFAULT 100,
        "max_capacity" double precision NOT NULL,
        "speed" double precision NOT NULL DEFAULT 1,
        "base_consumption" double precision NOT NULL,
        "risk_resistance" double precision NOT NULL DEFAULT 0,
        "status" varchar(20) NOT NULL DEFAULT 'AVAILABLE',
        "current_zone_id" uuid NOT NULL REFERENCES "zones"("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "orders" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "game_session_id" uuid NOT NULL REFERENCES "game_sessions"("id") ON DELETE CASCADE,
        "destination_zone_id" uuid NOT NULL REFERENCES "zones"("id"),
        "weight" double precision NOT NULL,
        "reward" integer NOT NULL,
        "urgency" varchar(20) NOT NULL,
        "risk" double precision NOT NULL,
        "status" varchar(20) NOT NULL DEFAULT 'PENDING',
        "expires_at" TIMESTAMPTZ NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "deliveries" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "game_session_id" uuid NOT NULL REFERENCES "game_sessions"("id") ON DELETE CASCADE,
        "order_id" uuid NOT NULL REFERENCES "orders"("id") ON DELETE CASCADE,
        "rover_id" uuid NOT NULL REFERENCES "rovers"("id") ON DELETE CASCADE,
        "route_id" uuid NOT NULL REFERENCES "routes"("id") ON DELETE CASCADE,
        "distance" double precision NOT NULL,
        "cargo_weight" double precision NOT NULL,
        "battery_cost" double precision NOT NULL,
        "travel_time" double precision NOT NULL,
        "final_risk" double precision NOT NULL,
        "reward" integer NOT NULL,
        "status" varchar(20) NOT NULL DEFAULT 'PREPARING',
        "started_at" TIMESTAMPTZ,
        "completed_at" TIMESTAMPTZ
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "game_events" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "game_session_id" uuid NOT NULL REFERENCES "game_sessions"("id") ON DELETE CASCADE,
        "type" varchar(40) NOT NULL,
        "title" varchar(120) NOT NULL,
        "description" text NOT NULL,
        "effects" jsonb NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_deliveries_order_id" ON "deliveries" ("order_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "game_events"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "deliveries"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "orders"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "rovers"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "game_sessions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "routes"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "zones"`);
  }
}
