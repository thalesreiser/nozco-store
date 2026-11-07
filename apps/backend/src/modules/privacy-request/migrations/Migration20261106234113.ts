import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20261106234113 extends Migration {
  override up(): Promise<void> {
    this.addSql(
      `create table if not exists "privacy_request" ("id" text not null, "customer_id" text not null, "type" text check ("type" in ('export', 'deletion')) not null, "status" text check ("status" in ('pending', 'completed', 'rejected', 'failed')) not null default 'pending', "decided_by" text null, "decided_at" timestamptz null, "completed_at" timestamptz null, "failure_code" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "privacy_request_pkey" primary key ("id"));`,
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_privacy_request_deleted_at" ON "privacy_request" ("deleted_at") WHERE deleted_at IS NULL;`,
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_privacy_request_customer_id" ON "privacy_request" ("customer_id") WHERE deleted_at IS NULL;`,
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_privacy_request_status" ON "privacy_request" ("status") WHERE deleted_at IS NULL;`,
    )
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_privacy_request_one_pending_deletion" ON "privacy_request" ("customer_id") WHERE type = 'deletion' AND status = 'pending' AND deleted_at IS NULL;`,
    )
    return Promise.resolve()
  }

  override down(): Promise<void> {
    this.addSql(`drop table if exists "privacy_request" cascade;`)
    return Promise.resolve()
  }
}
