-- Create Initial Tables

BEGIN;

CREATE TABLE "monthly_budgets" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "category" VARCHAR(255) NOT NULL,
    "month" DATE NOT NULL,
    "amount" FIAT_T NOT NULL,
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "monthly_budget_allocations" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "manager" ETH_ADDR_T DEFAULT NULL,
    "category" VARCHAR(255) NOT NULL UNIQUE,
    "amount" FIAT_T NOT NULL,
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMIT;
---- create above / drop below ----

BEGIN;


DROP TABLE IF EXISTS "monthly_budget_allocations";
DROP TABLE IF EXISTS "monthly_budgets";


COMMIT;
