-- Create Initial Tables

BEGIN;


CREATE TYPE TRANSFER_DIRECTION_T AS ENUM ('incoming', 'outgoing');

CREATE DOMAIN ETH_ADDR_T CHAR(42) CHECK (
    "value" IS NULL
    OR (
        lower("value") = "value"
        AND "value" ~ '^0x[0-9a-f]{40}$'
    )
);

CREATE DOMAIN ETH_HASH_T CHAR(66) CHECK (
    "value" IS NULL
    OR (
        lower("value") = "value"
        AND "value" ~ '^0x[0-9a-f]{64}$'
    )
);

CREATE DOMAIN ETHER_T DECIMAL(36, 18);
CREATE DOMAIN WEI_T DECIMAL(36, 0);
CREATE DOMAIN FIAT_T DECIMAL(15, 2);

CREATE TABLE IF NOT EXISTS "auth_nonces" (
    "nonce" UUID NOT NULL,
    "address" ETH_ADDR_T NOT NULL,
    "created_at" TIMESTAMP NOT NULL DEFAULT current_timestamp,
    "ip_addr" CIDR NOT NULL,
    CONSTRAINT "one_nonce_per_address_per_ip" UNIQUE ("address", "ip_addr")
);

CREATE OR REPLACE FUNCTION update_or_get_nonce(
    _address ETH_ADDR_T,
    _ip_addr CIDR,
    _nonce UUID,
    _after TIMESTAMP
) RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
    result UUID;
    last_nonce_creation TIMESTAMP;
BEGIN

SELECT INTO result, last_nonce_creation  "nonce", "created_at"  FROM "auth_nonces"
WHERE "address" = _address AND "ip_addr" = _ip_addr;


IF result IS NULL THEN
    INSERT INTO "auth_nonces" ("nonce", "address", "ip_addr")
    VALUES (_nonce, _address, _ip_addr)
    RETURNING _nonce INTO result;
ELSE
    IF last_nonce_creation < _after THEN
        UPDATE "auth_nonces"
        SET "nonce" = _nonce, created_at = current_timestamp
        WHERE "address" = _address AND "ip_addr" = _ip_addr
        RETURNING _nonce INTO result;
    END IF;
END IF;

RETURN result;
END;$$;

CREATE TABLE IF NOT EXISTS "meta" (
    "key" CHAR(255) NOT NULL PRIMARY KEY,
    "value" TEXT NOT NULL
);

-- Organization table - stores organization configuration
CREATE TABLE "settings" (
    "key" VARCHAR(100) PRIMARY KEY,
    "value" TEXT NOT NULL
);

-- Admin users table - stores administrator accounts
CREATE TABLE "admins" (
    "address" ETH_ADDR_T PRIMARY KEY, -- Ethereum address (0x + 40 hex chars)
    "name" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMPTZ DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ DEFAULT NOW()
);

-- Treasury wallets table - stores organization wallet addresses
CREATE TABLE "wallets" (
    "address" ETH_ADDR_T PRIMARY KEY, -- Ethereum address
    "created_at" TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE "assets" (
    "chain_id" BIGINT NOT NULL DEFAULT 1,
    "address" ETH_ADDR_T NOT NULL,
    "name" VARCHAR(100) NOT NULL, -- ETH, USDC, etc.
    "symbol" VARCHAR(20) NOT NULL,
    "decimals" INTEGER NOT NULL,
    PRIMARY KEY ("chain_id", "address")
);

INSERT INTO "assets" ("chain_id", "address", "name", "symbol", "decimals") VALUES 
(1, '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee', 'Ether', 'ETH', 18);

-- Treasury assets table - stores current asset holdings
CREATE TABLE "wallet_balances" (
    "chain_id" BIGINT NOT NULL DEFAULT 1,
    "address" ETH_ADDR_T NOT NULL,
    "wallet" ETH_ADDR_T NOT NULL REFERENCES "wallets" ("address") ON DELETE CASCADE,
    "amount" ETHER_T NOT NULL, -- Support high precision decimals
    "usd_worth" FIAT_T NOT NULL,
    "eth_worth" ETHER_T NOT NULL,
    "last_updated" TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY ("chain_id", "address", "wallet")
);

-- Transfer parties table - stores known payers and payees
CREATE TABLE "transfer_parties" (
    "address" ETH_ADDR_T PRIMARY KEY, -- Ethereum address
    "name" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMPTZ DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ DEFAULT NOW()
);

-- Transfers table - stores blockchain transactions
CREATE TABLE "transfers" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "chain_id" BIGINT NOT NULL DEFAULT 1, -- ethereum, polygon, etc.
    "tx_hash" ETH_HASH_T NOT NULL, -- Transaction hash (0x + 64 hex chars)
    "block_number" BIGINT NOT NULL,
    "log_index" BIGINT NOT NULL,
    "block_timestamp" BIGINT NOT NULL,
    "etherscan_link" TEXT,
    "direction" TRANSFER_DIRECTION_T NOT NULL,
    "payer_address" ETH_ADDR_T NOT NULL,
    "payee_address" ETH_ADDR_T NOT NULL,
    "asset" ETH_ADDR_T NOT NULL,
    "amount" WEI_T NOT NULL,
    UNIQUE ("chain_id", "tx_hash", "log_index")
);

-- Expenses table - stores organizational expenses
CREATE TABLE "expenses" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "item" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1 CHECK ("quantity" > 0),
    "price" FIAT_T NOT NULL CHECK ("price" >= 0),
    "purpose" TEXT DEFAULT NULL,
    "category" VARCHAR(100) NOT NULL,
    "date" DATE NOT NULL,
    "tx_hash" ETH_HASH_T DEFAULT NULL, -- Optional transaction hash
    "created_at" TIMESTAMPTZ DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ DEFAULT NOW()
);

-- Receipts table - stores expense receipt documents
CREATE TABLE "receipts" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "expense_id" UUID NOT NULL REFERENCES "expenses" ("id") ON DELETE CASCADE,
    "name" VARCHAR(255) NOT NULL,
    "file_name" VARCHAR(255) DEFAULT NULL,
    "file_size" BIGINT NOT NULL,
    "mime_type" VARCHAR(100) DEFAULT NULL,
    "storage_id" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMPTZ DEFAULT NOW()
);

-- Grants table - stores grant programs
CREATE TABLE "grants" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "name" VARCHAR(255) NOT NULL,
    "recipient_name" VARCHAR(255) NOT NULL,
    "description" TEXT NOT NULL,
    "team_url" TEXT,
    "project_url" TEXT,
    "status" TEXT,
    "recipient_address" ETH_ADDR_T NOT NULL,
    "total_grant_amount" ETHER_T NOT NULL,
    "initial_grant_amount" ETHER_T NOT NULL,
    "start_date" DATE NOT NULL,
    "expected_completion_date" DATE NOT NULL,
    "amount_given_so_far" ETHER_T NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ DEFAULT NOW()
);

-- Grant milestones table - stores grant milestone information
CREATE TABLE "milestones" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "grant_id" UUID NOT NULL REFERENCES "grants" ("id") ON DELETE CASCADE,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT NOT NULL,
    "status" VARCHAR(50) NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT FALSE,
    "signed_off" BOOLEAN NOT NULL DEFAULT FALSE,
    "grant_amount" ETHER_T NOT NULL,
    "order_index" INTEGER NOT NULL, -- To maintain milestone order
    "created_at" TIMESTAMPTZ DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE ("grant_id", "order_index")
);

-- Grant disbursements table - stores grant payment disbursements
CREATE TABLE "disbursements" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "grant_id" UUID NOT NULL REFERENCES "grants" ("id") ON DELETE CASCADE,
    "amount" ETHER_T NOT NULL,
    "tx_hash" ETH_HASH_T NOT NULL,
    "block_number" BIGINT NOT NULL,
    "block_timestamp" BIGINT NOT NULL,
    "created_at" TIMESTAMPTZ DEFAULT NOW()
);

-- Grant funds usage table - links expenses to grants
CREATE TABLE "grant_funds_usage" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "grant_id" UUID NOT NULL REFERENCES "grants" ("id") ON DELETE CASCADE,
    "created_at" TIMESTAMPTZ DEFAULT NOW(),
    "item" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1 CHECK ("quantity" > 0),
    "price" FIAT_T NOT NULL CHECK ("price" >= 0),
    "purpose" TEXT NOT NULL,
    "category" VARCHAR(100) NOT NULL,
    "date" DATE NOT NULL,
    "tx_hash" ETH_HASH_T DEFAULT NULL -- Optional transaction hash
);

-- Admin actions table - audit log for administrative actions
CREATE TABLE "admin_actions" (
    "admin_address" ETH_ADDR_T REFERENCES "admins"("address") ON DELETE SET NULL,
    "action" VARCHAR(50) NOT NULL,
    "resource_type" VARCHAR(50) NOT NULL,
    "resource_id" VARCHAR(50) NOT NULL,
    "details" JSONB, -- Store additional action details as JSON
    "created_at" TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance

-- Indexes for transfers table (most queried)
CREATE INDEX idx_transfers_timestamp ON "transfers" ("block_number" DESC);
CREATE INDEX idx_transfers_payer_address ON "transfers" ("payer_address");
CREATE INDEX idx_transfers_payee_address ON "transfers" ("payee_address");
CREATE INDEX idx_transfers_direction ON "transfers" ("direction");
CREATE INDEX idx_transfers_chain_asset ON "transfers" ("chain_id", "asset");
CREATE INDEX idx_transfers_block_number ON "transfers" ("block_number");

-- Indexes for expenses table
CREATE INDEX idx_expenses_category ON "expenses" ("category");
CREATE INDEX idx_expenses_date ON "expenses" ("date" DESC);
CREATE INDEX idx_expenses_created_at ON "expenses" ("created_at" DESC);

-- Indexes for grants table
CREATE INDEX idx_grants_recipient_address ON "grants" ("recipient_address");
CREATE INDEX idx_grants_start_date ON "grants" ("start_date");
CREATE INDEX idx_grants_status ON "grants" ("status");

-- Indexes for milestones table
CREATE INDEX idx_milestones_grant_id ON "milestones" ("grant_id");
CREATE INDEX idx_milestones_completed ON "milestones" ("completed");
CREATE INDEX idx_milestones_signed_off ON "milestones" ("signed_off");

-- Indexes for disbursements table
CREATE INDEX idx_disbursements_grant_id ON "disbursements" ("grant_id");
CREATE INDEX idx_disbursements_tx_hash ON "disbursements" ("tx_hash");

-- Indexes for receipts table
CREATE INDEX idx_receipts_expense_id ON "receipts" ("expense_id");


-- Indexes for grant_funds_usage table
CREATE INDEX idx_grant_funds_usage_grant_id ON "grant_funds_usage" ("grant_id");


COMMIT;
---- create above / drop below ----

BEGIN;
-- Drop tables in reverse order due to foreign key constraints
DROP TABLE IF EXISTS admin_actions CASCADE;
DROP TABLE IF EXISTS grant_funds_usage CASCADE;
DROP TABLE IF EXISTS disbursements CASCADE;
DROP TABLE IF EXISTS milestones CASCADE;
DROP TABLE IF EXISTS grants CASCADE;
DROP TABLE IF EXISTS receipts CASCADE;
DROP TABLE IF EXISTS expenses CASCADE;
DROP TABLE IF EXISTS transfers CASCADE;
DROP TABLE IF EXISTS transfer_parties CASCADE;
DROP TABLE IF EXISTS assets CASCADE;
DROP TABLE IF EXISTS wallets CASCADE;
DROP TABLE IF EXISTS admins CASCADE;
DROP TABLE IF EXISTS organizations CASCADE;

DROP FUNCTION IF EXISTS update_or_get_nonce;
DROP TABLE IF EXISTS "auth_nonces";
DROP DOMAIN IF EXISTS T_ETH_ADDR;

COMMIT;
