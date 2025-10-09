-- Create Initial Tables

BEGIN;


CREATE TABLE IF NOT EXISTS "categories" (
    "name" VARCHAR(100) PRIMARY KEY,
    "description" TEXT
);

INSERT INTO "categories" ("name", "description") VALUES ('Miscellaneous', 'Miscellaneous expenses') ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS  "monthly_budget_allocations" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "manager" VARCHAR(255) DEFAULT NULL,
    "category" VARCHAR(100) NOT NULL UNIQUE REFERENCES "categories"("name") ON DELETE CASCADE,
    "amount" FIAT_T NOT NULL,
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE "expenses" ALTER COLUMN "category" SET DEFAULT 'Miscellaneous';
ALTER TABLE "expenses" ADD CONSTRAINT "fk_expenses_category" FOREIGN KEY ("category") REFERENCES "categories"("name") ON DELETE CASCADE;

ALTER TABLE "grant_funds_usage" ALTER COLUMN "category" SET DEFAULT 'Miscellaneous';
ALTER TABLE "grant_funds_usage" ADD CONSTRAINT "fk_grant_funds_usage_category" FOREIGN KEY ("category") REFERENCES "categories"("name") ON DELETE CASCADE;


COMMIT;
---- create above / drop below ----

BEGIN;

DROP TABLE IF EXISTS "categories";
DROP TABLE IF EXISTS "monthly_budget_allocations";

COMMIT;
