import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20261107200232 extends Migration {
  override up(): Promise<void> {
    this.addSql(
      `alter table if exists "privacy_request" add column if not exists "rejection_reason" text null;`,
    )
    return Promise.resolve()
  }

  override down(): Promise<void> {
    this.addSql(`alter table if exists "privacy_request" drop column if exists "rejection_reason";`)
    return Promise.resolve()
  }
}
