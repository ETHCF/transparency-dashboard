# API Test Script

This directory contains a Python test script for the transparency dashboard API.

## Setup

1. Install Python dependencies:
```bash
pip install -r requirements.txt
```

## Usage

The test script requires a private key and will perform the following operations:

1. **Authentication** - Uses SIWE (Sign-In with Ethereum) to authenticate
2. **Add Transfer Parties** - Creates wallet entries for transactions
3. **Set Organization Name** - Updates the organization settings
4. **Create Sample Grant** - Creates a test grant entry

### Basic Usage

```bash
python test_api.py --private-key 0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef
```

### Full Options

```bash
python test_api.py \
  --private-key 0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef \
  --base-url http://localhost:8080 \
  --org-name "My Test Organization"
```

### Options

- `--private-key`: Ethereum private key (required, with 0x prefix)
- `--base-url`: API base URL (default: http://localhost:8080)
- `--org-name`: Organization name to set (default: "Test Organization")

## Security Note

⚠️ **Never use real private keys with valuable assets for testing!** Always use test accounts or dedicated testing private keys.

## What the Script Does

1. **Authentication Flow**:
   - Requests a SIWE challenge from `/api/v1/auth/challenge`
   - Signs the challenge message with the private key
   - Verifies the signature at `/api/v1/auth/verify` to get a JWT token

2. **Data Operations**:
   - Sets organization name via `PUT /api/v1/settings/organization-name`
   - Creates transfer parties (wallets) via `PUT /api/v1/transfer-parties`
   - Creates a sample grant via `POST /api/v1/grants`
   - Fetches data to verify operations

3. **Verification**:
   - Gets organization name to confirm it was set
   - Lists treasury wallets and transfers to verify data was created