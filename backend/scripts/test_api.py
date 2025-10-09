#!/usr/bin/env python3
"""
Test script for the transparency dashboard API.

This script demonstrates how to:
1. Authenticate using a private key and SIWE (Sign-In with Ethereum)
2. Add transactions/transfer parties
3. Add wallets (transfer parties)
4. Set the organization name
5. Create grants with milestones, disbursements, and funds usage
6. Add assets
7. Create monthly budgets and budget allocations

Usage:
    python test_api.py --private-key <your_private_key> --base-url http://localhost:8080
"""

import argparse
from datetime import datetime, timezone
from typing import Dict, Any, Optional

import requests
from eth_account.signers.local import LocalAccount

from web3 import Web3
from eth_account.messages import encode_defunct


class TransparencyDashboardAPI:
    account: LocalAccount

    def __init__(self, base_url: str, private_key: str):
        self.w3 = Web3()
        self.base_url = base_url.rstrip('/')
        self.account = self.w3.eth.account.from_key(private_key)
        self.address = self.account.address
        self.jwt_token: Optional[str] = None
        self.session = requests.Session()

    def authenticate(self) -> bool:
        """
        Authenticate using SIWE (Sign-In with Ethereum) flow.
        Returns True if successful, False otherwise.
        """
        try:
            print(f"🔑 Authenticating with address: {self.address}")
            # Step 1: Generate challenge
            challenge_response = self._generate_challenge()
            if not challenge_response:
                return False

            # Step 2: Parse the SIWE message and sign it
            message = challenge_response["message"]
            signature = self._sign_message(message)
            if not signature:
                return False

            # Step 3: Verify the challenge and get JWT token
            jwt_token = self._verify_challenge(message, signature)
            if not jwt_token:
                return False

            self.jwt_token = jwt_token
            self.session.headers.update({"Authorization": f"Bearer {jwt_token}"})
            print(f"✓ Authentication successful for address: {self.address}")
            return True

        except Exception as e:
            print(f"✗ Authentication failed: {e}")
            return False

    def _generate_challenge(self) -> Optional[Dict[str, Any]]:
        """Generate SIWE challenge from the server."""
        url = f"{self.base_url}/api/v1/auth/challenge/{self.address}"
       
        try:
            response = self.session.get(url)
            response.raise_for_status()
            return response.json()
        except requests.RequestException as e:
            print(f"✗ Failed to generate challenge: {e}")
            return None

    def _sign_message(self, message: str) -> Optional[str]:
        """Sign the SIWE message with the private key."""
        try:
            # Sign the message
            signed_message = self.account.sign_message(encode_defunct(text=message))
            return signed_message.signature.hex()
        except Exception as e:
            print(f"✗ Failed to sign message: {e}")
            return None

    def _verify_challenge(self, message: str, signature: str) -> Optional[str]:
        """Verify the signed challenge and get JWT token."""
        url = f"{self.base_url}/api/v1/auth/verify"
        if not signature.startswith("0x"):
            signature = "0x" + signature
        payload = {
            "siweMessage": message,
            "signature": signature
        }

        try:
            response = self.session.post(url, json=payload)
            response.raise_for_status()
            result = response.json()
            return result.get("token")
        except requests.RequestException as e:
            print(f"✗ Failed to verify challenge: {e}")
            return None

    def add_transfer_party(self, address: str, name: str) -> bool:
        """Add or update a transfer party (wallet)."""
        url = f"{self.base_url}/api/v1/transfer-parties"
        payload = {
            "address": address,
            "name": name
        }

        try:
            response = self.session.post(url, json=payload)
            response.raise_for_status()
            print(f"✓ Added transfer party: {name} ({address})")
            return True
        except requests.RequestException as e:
            print(f"✗ Failed to add transfer party: {e}")
            return False

    def add_wallet(self, address: str) -> bool:
        """Add a wallet"""
        url = f"{self.base_url}/api/v1/treasury/wallets"
        payload = {
            "address": address,
        }
        try:
            response = self.session.post(url, json=payload)
            response.raise_for_status()
            print(f"✓ Added wallet: {address}")
            return True
        except requests.RequestException as e:
            print(f"✗ Failed to add wallet: {e}")
            return False

    def update_transfer_party_name(self, address: str, name: str) -> bool:
        """Update the name of an existing transfer party."""
        url = f"{self.base_url}/api/v1/transfer-parties/{address}/name"
        payload = {
            "name": name,
            "address": address
        }

        try:
            response = self.session.put(url, json=payload)
            response.raise_for_status()
            print(f"✓ Updated transfer party name: {name} ({address})")
            return True
        except requests.RequestException as e:
            print(f"✗ Failed to update transfer party name: {e}")
            return False

    def set_organization_name(self, name: str) -> bool:
        """Set the organization name."""
        url = f"{self.base_url}/api/v1/settings/organization-name"
        payload = {"name": name}

        try:
            response = self.session.put(url, json=payload)
            response.raise_for_status()
            print(f"✓ Set organization name: {name}")
            return True
        except requests.RequestException as e:
            print(f"✗ Failed to set organization name: {e}")
            return False

    def get_organization_name(self) -> Optional[str]:
        """Get the current organization name."""
        url = f"{self.base_url}/api/v1/settings/organization-name"

        try:
            response = self.session.get(url)
            response.raise_for_status()
            result = response.json()
            return result.get("name")
        except requests.RequestException as e:
            print(f"✗ Failed to get organization name: {e}")
            return None

    def get_grants(self) -> Optional[list]:
        """Get all grants."""
        url = f"{self.base_url}/api/v1/grants"

        try:
            response = self.session.get(url)
            response.raise_for_status()
            result = response.json()
            return result
        except requests.RequestException as e:
            print(f"✗ Failed to get grants: {e}")
            return None

    def create_grant(self, grant_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Create a new grant."""
        url = f"{self.base_url}/api/v1/grants"

        try:
            response = self.session.post(url, json=grant_data)
            response.raise_for_status()
            result = response.json()
            print(f"✓ Created grant: {grant_data['name']} (ID: {result.get('id')})")
            return result
        except requests.RequestException as e:
            print(f"✗ Failed to create grant: {e}")
            return None

    def add_milestones(self, grant_id: str, milestones: list) -> bool:
        """Add milestones to a grant."""
        url = f"{self.base_url}/api/v1/grants/{grant_id}/milestones"

        try:
            response = self.session.put(url, json={"milestones": milestones})
            response.raise_for_status()
            print(f"✓ Added {len(milestones)} milestones to grant {grant_id}")
            return True
        except requests.RequestException as e:
            print(f"✗ Failed to add milestones: {e}")
            return False

    def create_disbursement(self, grant_id: str, disbursement_data: Dict[str, Any]) -> bool:
        """Create a disbursement for a grant."""
        url = f"{self.base_url}/api/v1/grants/{grant_id}/disbursements"

        try:
            response = self.session.post(url, json=disbursement_data)
            response.raise_for_status()
            print(
                "✓ Created disbursement "
                f"{disbursement_data.get('txHash', 'unknown tx')} for grant {grant_id}"
            )
            return True
        except requests.RequestException as e:
            print(
                "✗ Failed to create disbursement: "
                f"{e} {getattr(e.response, 'text', '')}"
            )
            return False

    def create_funds_usage(self, grant_id: str, funds_usage_data: Dict[str, Any]) -> bool:
        """Create a funds usage entry for a grant."""
        url = f"{self.base_url}/api/v1/grants/{grant_id}/funds-usage"

        try:
            response = self.session.post(url, json=funds_usage_data)
            response.raise_for_status()
            print(
                "✓ Created funds usage entry "
                f"{funds_usage_data.get('item', 'unknown item')} for grant {grant_id}"
            )
            return True
        except requests.RequestException as e:
            print(
                "✗ Failed to create funds usage entry: "
                f"{e} {getattr(e.response, 'text', '')}"
            )
            return False

    def add_admin(self, address: str, name: str) -> bool:
        """Add an admin to the system."""
        url = f"{self.base_url}/api/v1/admins"
        payload = {
            "address": address,
            "name": name
        }

        try:
            response = self.session.post(url, json=payload)
            response.raise_for_status()
            print(f"✓ Added admin: {name} ({address})")
            return True
        except requests.RequestException as e:
            print(f"✗ Failed to add admin: {e} {getattr(e.response, 'text', '')}")
            return False
        
    def list_admins(self) -> Optional[list]:
        """List all admins."""
        url = f"{self.base_url}/api/v1/admins"

        try:
            response = self.session.get(url)
            response.raise_for_status()
            result = response.json()
            return result
        except requests.RequestException as e:
            print(f"✗ Failed to list admins: {e}")
            return None

    def get_treasury_wallets(self) -> Optional[list]:
        """Get treasury wallets."""
        url = f"{self.base_url}/api/v1/treasury/wallets"

        try:
            response = self.session.get(url)
            response.raise_for_status()
            result = response.json()
            return result
        except requests.RequestException as e:
            print(f"✗ Failed to get treasury wallets: {e}")
            return None

    def create_transfer(self, transfer_data: Dict[str, Any]) -> bool:
        """Create a new transfer."""
        url = f"{self.base_url}/api/v1/transfers"
        response = self.session.post(url, json=transfer_data)
        try:
           
            response.raise_for_status()
            print(f"✓ Created transfer: {transfer_data.get('txHash', 'Unknown')}")
            return True
        except requests.RequestException as e:
            print(f"✗ Failed to create transfer: {e} {response.text}")
            return False

    def add_asset(self, asset_data: Dict[str, Any]) -> bool:
        """Add a new asset."""
        url = f"{self.base_url}/api/v1/treasury/assets"

        try:
            response = self.session.post(url, json=asset_data)
            response.raise_for_status()
            print(f"✓ Added asset: {asset_data.get('name', 'Unknown')} ({asset_data.get('address', 'Unknown')})")
            return True
        except requests.RequestException as e:
            print(f"✗ Failed to add asset: {e}")
            return False

    def get_transfers(self, limit: int = 10) -> Optional[list]:
        """Get transfers."""
        url = f"{self.base_url}/api/v1/transfers"
        params = {"limit": limit}

        try:
            response = self.session.get(url, params=params)
            response.raise_for_status()
            result = response.json()
            return result
        except requests.RequestException as e:
            print(f"✗ Failed to get transfers: {e}")
            return None


    def create_monthly_budget_allocation(self, allocation_data: Dict[str, Any]) -> Optional[str]:
        """Create a new monthly budget allocation."""
        url = f"{self.base_url}/api/v1/budgets/allocations"

        try:
            response = self.session.post(url, json=allocation_data)
            response.raise_for_status()
            result = response.json()
            print(f"✓ Created monthly budget allocation: {allocation_data['category']} (ID: {result.get('id')})")
            return result.get("id")
        except requests.RequestException as e:
            print(f"✗ Failed to create monthly budget allocation: {e} {getattr(e.response, 'text', '')}")
            return None

    def get_monthly_budget_allocations(self) -> Optional[list]:
        """Get all monthly budget allocations."""
        url = f"{self.base_url}/api/v1/budgets/allocations"

        try:
            response = self.session.get(url)
            response.raise_for_status()
            result = response.json()
            return result
        except requests.RequestException as e:
            print(f"✗ Failed to get monthly budget allocations: {e}")
            return None

    def create_category(self, category_data: Dict[str, Any]) -> bool:
        """Create a new category."""
        url = f"{self.base_url}/api/v1/categories"

        try:
            response = self.session.post(url, json=category_data)
            response.raise_for_status()
            print(f"✓ Created category: {category_data['name']}")
            return True
        except requests.RequestException as e:
            print(f"✗ Failed to create category: {e} {getattr(e.response, 'text', '')}")
            return False

    def get_categories(self) -> Optional[list]:
        """Get all categories."""
        url = f"{self.base_url}/api/v1/categories"

        try:
            response = self.session.get(url)
            response.raise_for_status()
            result = response.json()
            return result
        except requests.RequestException as e:
            print(f"✗ Failed to get categories: {e}")
            return None

    def create_expense(self, expense_data: Dict[str, Any]) -> bool:
        """Create a new expense."""
        url = f"{self.base_url}/api/v1/expenses"

        try:
            response = self.session.post(url, json=expense_data)
            response.raise_for_status()
            print(f"✓ Created expense: {expense_data['item']} - ${expense_data['price']}")
            return True
        except requests.RequestException as e:
            print(f"✗ Failed to create expense: {e} {getattr(e.response, 'text', '')}")
            return False


def main():
    parser = argparse.ArgumentParser(description="Test the transparency dashboard API")
    # 0x11A282e7bB9bE921313dDB6DAa2afbff920231C9, do not put any funds in this address, public testing private key
    parser.add_argument("--private-key", default="0xd4b33f441005178719b27e3fb0532002bc8dbf951b185d2033cd12354dd91d5a", help="Ethereum private key (with 0x prefix)")
    parser.add_argument("--base-url", default="http://localhost:8080", help="API base URL")
    parser.add_argument("--org-name", default="Test Organization", help="Organization name to set")

    args = parser.parse_args()

    # Initialize API client
    api = TransparencyDashboardAPI(args.base_url, args.private_key)

    print(f"🚀 Starting API test for address: {api.address}")
    print(f"📍 API base URL: {args.base_url}")
    print("-" * 60)

    step = 1

    # Step: Authenticate
    print(f"{step}. Authenticating...")
    if not api.authenticate():
        print("❌ Authentication failed. Exiting.")
        return 1
    step += 1

    # Step: Add admin
    print(f"\n{step}. Adding admin...")
    api.add_admin("0x2eDecb91091324e0138EBBBaEd48ce1B2A050428", "Test Admin")
    step += 1

    # Step: Set organization name
    print(f"\n{step}. Setting organization name...")
    if api.set_organization_name(args.org_name):
        current_name = api.get_organization_name()
        print(f"   Current organization name: {current_name}")
    step += 1

    # Step: Add some transfer parties (wallets)
    print(f"\n{step}. Adding transfer parties (wallets)...")
    test_wallets = [
        {
            "address": "0x742d35Cc6634C0532925a3b8D581C8D1f8B9C942",
            "name": "Test Treasury Wallet"
        },
        {
            "address": "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
            "name": "Test External Partner"
        },
        {
            "address": api.address,
            "name": "Test Script Runner"
        }
    ]

    treasury_wallets = [
        {"address": "0x742d35Cc6634C0532925a3b8D581C8D1f8B9C942"},
        {"address": "0x267be1c1d684f78cb4f6a1e1f4c9f2b3c2b5d142"},
        {"address": "0xf8f74F2c34959F700F2617a71D19Be13BC42beb9"},
    ]
    for wallet in treasury_wallets:
        api.add_wallet(wallet["address"])

    for wallet in test_wallets:
        api.add_transfer_party(wallet["address"], wallet["name"])

    step += 1

    # Step: Create/manage a sample grant
    print(f"\n{step}. Creating/managing a sample grant...")
    sample_grant = {
        "name": "Test Grant Project",
        "recipientName": "Test Developer",
        "recipientAddress": "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
        "description": "A test grant for API demonstration purposes",
        "teamUrl": "https://github.com/testdev",
        "projectUrl": "https://testproject.com",
        "totalGrantAmount": "10000.00",
        "initialGrantAmount": "2500.00",
        "startDate": datetime.now(timezone.utc).isoformat(),
        "expectedCompletionDate": datetime(2024, 12, 31, tzinfo=timezone.utc).isoformat(),
        "status": "active"
    }

    # Check if grant already exists
    print("   Checking for existing grants...")
    existing_grants = api.get_grants()
    existing_grant = None

    if existing_grants:
        for grant in existing_grants:
            if grant.get("name") == sample_grant["name"]:
                existing_grant = grant
                print(f"   Found existing grant: {grant['name']} (ID: {grant.get('id')})")
                break

    if existing_grant:
        grant_id = existing_grant.get("id")
        print(f"   Grant already exists, checking milestones...")

        # Check if grant has milestones (this would require a get milestones endpoint)
        # For now, we'll assume it needs milestones and add them
        sample_milestones = [
            {
                "title": "Project Setup",
                "description": "Initial project setup and planning",
                "dueDate": datetime(2024, 6, 30, tzinfo=timezone.utc).isoformat(),
                "amount": "2500.00",
                "status": "completed",
                "completed": True,
                "signedOff": True
            },
            {
                "title": "Development Phase 1",
                "description": "Core functionality implementation",
                "dueDate": datetime(2024, 9, 30, tzinfo=timezone.utc).isoformat(),
                "amount": "3750.00",
                "status": "pending",
                "completed": False,
                "signedOff": False
            },
            {
                "title": "Testing & Documentation",
                "description": "Testing, documentation, and final delivery",
                "dueDate": datetime(2024, 12, 31, tzinfo=timezone.utc).isoformat(),
                "amount": "3750.00",
                "status": "pending"
            }
        ]

        if grant_id:
            api.add_milestones(grant_id, sample_milestones)
    else:
        print("   Creating new grant...")
        created_grant = api.create_grant(sample_grant)

        if created_grant:
            grant_id:str = str(created_grant.get("id"))
            print("   Adding milestones to new grant...")

            sample_milestones = [
                {
                    "title": "Project Setup",
                    "description": "Initial project setup and planning",
                    "dueDate": datetime(2024, 6, 30, tzinfo=timezone.utc).isoformat(),
                    "amount": "2500.00",
                    "status": "completed"
                },
                {
                    "title": "Development Phase 1",
                    "description": "Core functionality implementation",
                    "dueDate": datetime(2024, 9, 30, tzinfo=timezone.utc).isoformat(),
                    "amount": "3750.00",
                    "status": "in_progress"
                },
                {
                    "title": "Testing & Documentation",
                    "description": "Testing, documentation, and final delivery",
                    "dueDate": datetime(2024, 12, 31, tzinfo=timezone.utc).isoformat(),
                    "amount": "3750.00",
                    "status": "pending"
                }
            ]

            api.add_milestones(grant_id, sample_milestones)
            print("   Creating disbursements for new grant...")
            base_timestamp = int(datetime.now(timezone.utc).timestamp())
            sample_disbursements = [
                {
                    "amount": "2500.00",
                    "txHash": "0xee0bb850b6b52e393de3227b82d50a42ed5c912c152ebb5332e5be5994076837",
                    "blockNumber": 18500010,
                    "blockTimestamp": base_timestamp
                },
                {
                    "amount": "3750.00",
                    "txHash": "0x167c85e9d6403c6ccd9e30ec2dab81e6dbfc4242e083cafa3bc9d021d329b2d6",
                    "blockNumber": 18500020,
                    "blockTimestamp": base_timestamp + 300
                }
            ]
            for disbursement in sample_disbursements:
                api.create_disbursement(grant_id, disbursement)

            print("   Creating categories for funds usage...")
            required_categories = [
                {
                    "name": "Hardware",
                    "description": "Physical equipment and devices"
                },
                {
                    "name": "Software",
                    "description": "Software licenses and subscriptions"
                },
                {
                    "name": "Infrastructure",
                    "description": "Cloud services and infrastructure costs"
                },
                {
                    "name": "Travel",
                    "description": "Travel and conference expenses"
                }
            ]
            for category in required_categories:
                api.create_category(category)

            print("   Creating funds usage entries for new grant...")
            sample_funds_usage = [
                {
                    "item": "Development Laptop",
                    "quantity": 1,
                    "price": "1200.00",
                    "purpose": "Development work for milestone 1",
                    "category": "Hardware",
                    "date": datetime.now(timezone.utc).isoformat(),
                    "txHash": "0xee0bb850b6b52e393de3227b82d50a42ed5c912c152ebb5332e5be5994076837"
                },
                {
                    "item": "IDE License",
                    "quantity": 2,
                    "price": "299.99",
                    "purpose": "Development tools for team",
                    "category": "Software",
                    "date": datetime.now(timezone.utc).isoformat(),
                },
                {
                    "item": "Cloud Server",
                    "quantity": 6,
                    "price": "85.00",
                    "purpose": "Hosting and testing infrastructure",
                    "category": "Infrastructure",
                    "date": datetime.now(timezone.utc).isoformat(),
                },
                {
                    "item": "Conference Attendance",
                    "quantity": 1,
                    "price": "450.00",
                    "purpose": "Research and networking for project development",
                    "category": "Travel",
                    "date": datetime.now(timezone.utc).isoformat(),
                }
            ]

            for funds_usage in sample_funds_usage:
                api.create_funds_usage(grant_id, funds_usage)

    step += 1

    # Step: Add test assets
    print(f"\n{step}. Adding assets...")
    test_assets = [
        {
            "chainId": 1,
            "address": "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
            "name": "USDC",
            "symbol": "USDC",
            "decimals": 6
        },
        {
            "chainId": 1,
            "address": "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
            "name": "Wrapped Ethereum",
            "symbol": "WETH",
            "decimals": 18
        },
        {
            "chainId": 1,
            "address": "0x6b175474e89094c44da98b954eedeac495271d0f",
            "name": "Dai Stablecoin",
            "symbol": "DAI",
            "decimals": 18
        },
        {
            "chainId": 1,
            "address": "0x7d1afa7b718fb893db30a3abc0cfc608aacfebb0",
            "name": "Matic Token",
            "symbol": "MATIC",
            "decimals": 18
        }
    ]

    for asset in test_assets:
        api.add_asset(asset)

    step += 1

    # # Step: Create some test transfers
    # print(f"\n{step}. Creating test transfers...")
    # test_transfers = [
    #     {
    #         "txHash": "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
    #         "blockNumber": 18500000,
    #         "blockTimestamp": int(datetime.now().timestamp()),
    #         "payerAddress": "0x742d35Cc6634C0532925a3b8D581C8D1f8B9C942",
    #         "payeeAddress": "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
    #         "asset": "0xA0b86a33E6441d0b59f4bd0bd8d3E58bB6DFdAd7",
    #         "amount": "1000.50",
    #         "direction": "outgoing",
    #         "logIndex": 0
    #     },
    #     {
    #         "txHash": "0x2c1b1b21334fb8c365fee410842ceaafe690c697cace1e95d0ab182e2b33976e",
    #         "blockNumber": 18500001,
    #         "blockTimestamp": int(datetime.now().timestamp()) + 300,
    #         "payerAddress": "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
    #         "payeeAddress": "0x742d35Cc6634C0532925a3b8D581C8D1f8B9C942",
    #         "asset": "0xA0b86a33E6441d0b59f4bd0bd8d3E58bB6DFdAd7",
    #         "amount": "500.25",
    #         "direction": "incoming",
    #         "logIndex": 0
    #     },
    #     {
    #         "txHash": "0x22599763f5ca2252988bc0e9205569a3be965d8312338f025eb3c341d2f11281",
    #         "blockNumber": 18500002,
    #         "blockTimestamp": int(datetime.now().timestamp()) + 600,
    #         "payerAddress": "0x742d35Cc6634C0532925a3b8D581C8D1f8B9C942",
    #         "payeeAddress": "0x8ba1f109551bD432803012645fac136c89c02aBC",
    #         "asset": "0xA0b86a33E6441d0b59f4bd0bd8d3E58bB6DFdAd7",
    #         "amount": "2500.00",
    #         "direction": "outgoing",
    #         "logIndex": 0
    #     }
    # ]

    # for transfer in test_transfers:
    #     api.create_transfer(transfer)

    step += 1

    # Step: Create monthly budget allocations
    print(f"\n{step}. Creating monthly budget allocations...")
    test_allocations = [
        {
            "manager": "0x2eDecb91091324e0138EBBBaEd48ce1B2A050428",
            "category": "Infrastructure",
            "amount": "150000.00"
        },
        {
            "manager": "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
            "category": "Hardware",
            "amount": "80000.00"
        },
        {
            "manager": None,
            "category": "Software",
            "amount": "50000.00"
        }
    ]

    for allocation in test_allocations:
        api.create_monthly_budget_allocation(allocation)

    step += 1

    # Step: Create expenses
    print(f"\n{step}. Creating expenses...")
    test_expenses = [
        {
            "item": "AWS Cloud Services",
            "quantity": 1,
            "price": "1250.00",
            "purpose": "Server hosting for Q1",
            "category": "Infrastructure",
            "date": datetime.now(timezone.utc).isoformat()
        },
        {
            "item": "MacBook Pro M3",
            "quantity": 2,
            "price": "1750.00",
            "purpose": "Development laptops for new team members",
            "category": "Hardware",
            "date": datetime.now(timezone.utc).isoformat()
        },
        {
            "item": "JetBrains All Products Pack",
            "quantity": 5,
            "price": "179.80",
            "purpose": "Annual IDE licenses for development team",
            "category": "Software",
            "date": datetime.now(timezone.utc).isoformat()
        },
        {
            "item": "ETH Denver Conference Pass",
            "quantity": 3,
            "price": "800.00",
            "purpose": "Conference attendance and networking",
            "category": "Travel",
            "date": datetime.now(timezone.utc).isoformat()
        },
        {
            "item": "DigitalOcean Droplets",
            "quantity": 6,
            "price": "130.00",
            "purpose": "Monthly cloud infrastructure costs",
            "category": "Infrastructure",
            "date": datetime.now(timezone.utc).isoformat()
        },
        {
            "item": "External Monitor 32\"",
            "quantity": 4,
            "price": "412.50",
            "purpose": "Workstation setup for remote team",
            "category": "Hardware",
            "date": datetime.now(timezone.utc).isoformat()
        }
    ]

    for expense in test_expenses:
        api.create_expense(expense)

    step += 1

    # Step: Get some data to verify everything works
    print(f"\n{step}. Fetching data to verify...")

    wallets = api.get_treasury_wallets()
    if wallets:
        print(f"   Found {len(wallets)} treasury wallets")

    transfers = api.get_transfers()
    if transfers:
        print(f"   Found {len(transfers)} transfers")

    admins = api.list_admins()
    if admins is not None:
        print(f"   Found {len(admins)} admins")
    else:
        print("   Failed to fetch admins")

    allocations = api.get_monthly_budget_allocations()
    if allocations is not None:
        print(f"   Found {len(allocations)} monthly budget allocations")
    else:
        print("   Failed to fetch monthly budget allocations")

    print("\n✅ API test completed successfully!")
    print("-" * 60)
    print("Summary:")
    print(f"  • Authenticated with address: {api.address}")
    print(f"  • Set organization name: {args.org_name}")
    print(f"  • Added {len(test_wallets)} transfer parties")
    print("  • Created/managed 1 sample grant with milestones, disbursements, and funds usage entries")
    print(f"  • Added {len(test_assets)} test assets")
    print(f"  • Created {len(test_allocations)} monthly budget allocations")
    print(f"  • Created {len(test_expenses)} expenses across different categories")
    #print(f"  • Created {len(test_transfers)} test transfers")

    return 0


if __name__ == "__main__":
    exit(main())
