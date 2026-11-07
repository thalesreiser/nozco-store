import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20261107170347 extends Migration {
  override up(): Promise<void> {
    this.addSql(
      `create table if not exists "home_announcement" ("id" text not null, "message" text not null, "link_url" text null, "rank" integer not null default 0, "is_published" boolean not null default false, "starts_at" timestamptz null, "ends_at" timestamptz null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "home_announcement_pkey" primary key ("id"));`,
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_home_announcement_deleted_at" ON "home_announcement" ("deleted_at") WHERE deleted_at IS NULL;`,
    )

    this.addSql(
      `create table if not exists "home_banner" ("id" text not null, "title" text not null, "image_url" text not null, "image_alt" text not null, "cta_label" text null, "cta_url" text null, "rank" integer not null default 0, "is_published" boolean not null default false, "starts_at" timestamptz null, "ends_at" timestamptz null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "home_banner_pkey" primary key ("id"));`,
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_home_banner_deleted_at" ON "home_banner" ("deleted_at") WHERE deleted_at IS NULL;`,
    )
    return Promise.resolve()
  }

  override down(): Promise<void> {
    this.addSql(`drop table if exists "home_announcement" cascade;`)

    this.addSql(`drop table if exists "home_banner" cascade;`)
    return Promise.resolve()
  }
}
