-- Add index on tx_hash for expense lookup by transaction hash

BEGIN;

CREATE INDEX IF NOT EXISTS idx_expenses_tx_hash ON "expenses" ("tx_hash");

COMMIT;
---- create above / drop below ----

BEGIN;

DROP INDEX IF EXISTS idx_expenses_tx_hash;

COMMIT;
