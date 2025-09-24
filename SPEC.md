# Summary
An open source dashboard which can be used for tracking grants and spending on-chain, allowing for much greater transparency compared to what exists today. The focus will be on ease of deployment and simplicity in order to allow for smooth and fast adoption. 
# Requirements

## Information to display
Name of Organization

### Treasury Assets 
* Asset Name
* Amount
* USD Worth
* ETH Worth

### Wallets
* Address
* Etherscan Link

### Transfers (transfers to & from the organizations wallets)
* Chain
* Tx Hash
* Etherscan Link
* Incoming/Outgoing
* Payer (name & address)
* Payee (name & address)
* Timestamp & Block Number
* Asset
* Amount

### Expense
* Item
* Quantity
* Price
* Purpose
* Category
* Date
* TX Hash (optional) 


### Grants
* Name
* Recipient Name
* Description
* Team URL
* Project URL
* Status (What is the last completed milestone, if any, or has it yet to start, etc)
* Recipient (name and address)
* Total Grant Amount
* Initial Grant Amount
* Start Date
* Expected Completion Date
* Disbursements (list of transaction hashes)
	* Amount
	* Tx Hash
* Funds Usage (A list of expenses showing where the funds have been used, see above Expense entry for information)
* Amount Given Thus Far
* Milestones (Ordered list of each milestone and the grant amount once reached)
	* Name
	* Description
	* Completed?
	* Signed off?
	* Grant Amount
	
## Functionality
### Admin
* Admins must have a CRUD interface for expenses
* Admins must be able to upload/delete related documents for an expense
* Admins must be able to add/update payees name/address
* Admins must be able to create grants, update grant details and add details about disbursements
* Admins must be able to define and update the status of grant milestones
* Admins must be able to list/add/remove other admins
* Admins must be able to set the Organization name
### Authentication
* Admins must be able to log in with their ethereum account
* The log in portal should not be visible from the end user view page. 
*  Authentication should not be required to view all of the above information
### Accounting
* On chain transactions involving relevant wallets are tracked and added
* The balances of wallets (such as the treasury) are shown
* Deployment (Developer UX)
* Developers must be able to deploy the dashboard and associated infrastructure to kubernetes without any understanding of the underlying code. 
* Developers must be able to specify an initial admin ethereum address
* There must be a helm chart available that is installable as a helm repository, this helm chart must include every dependency, and handle all aspects of deployment when the developer runs helm install
* There should be a railway template available, so that users can deploy it without using kubernetes, they can just click deploy now in railway.
* The backend and frontend should be dockerized in separate docker images published on the ethcf docker hub. 
* Docker arm and x86 versions of the docker images should be available. 
### Viewing
* Users must be able to look at expenses, and filter them by category
* Users must be able to look at grants and the associated details
* Users must be able to search for grants by name
* Users must be able to filter grants by active/previous grants


# Technical Specification


## Design Goals

* We want the setup and deployment of this dashboard to be as frictionless as possible.
* We want to minimize external service dependencies, e.g. (TheGraph) 
* All running services should be light to reduce the infrastructure burden as much as possible.


## API Spec

See [OpenAPI Spec](./openapi.yaml)

## Architecture

### Frontend

#### View Page /

The main public dashboard that displays organizational transparency data. This page provides read-only access to all organizational financial information without requiring authentication.

**Treasury Overview Section:**
- Display organization name prominently at the top
- Show total treasury value in both USD and ETH
- List all treasury assets with:
  - Asset name (ETH, USDC, etc.)
  - Current amount held
  - USD worth
  - ETH equivalent value
- Display all organization wallet addresses with Etherscan links
- Show last updated timestamp for treasury data

**Transfers Section:**
- Paginated list of all transfers to/from organization wallets
- Each transfer displays:
  - Chain name
  - Transaction hash with Etherscan link
  - Direction indicator (incoming/outgoing)
  - Payer and payee names/addresses
  - Timestamp and block number
  - Asset type and amount transferred
- Pagination controls (limit/offset)

**Expenses Section:**
- Filterable list of organizational expenses
- Filter by category dropdown
- Each expense shows:
  - Item description
  - Quantity and price
  - Purpose and category
  - Date of expense
  - Transaction hash (if paid on-chain)
- Pagination controls

**Grants Section:**
- Search functionality for grants by name
- Filter by grant status (active/previous)
- Each grant displays:
  - Grant name and recipient name
  - Description
  - Team and project URLs (if provided)
  - Current status
  - Recipient address
  - Total grant amount and initial amount
  - Start date and expected completion date
  - Progress indicator showing amount given so far
  - Milestone list with completion status
  - Disbursement history with transaction hashes
  - Funds usage breakdown (expenses)
- Pagination controls

**Technical Requirements:**
- No authentication required for viewing
- Responsive design for mobile and desktop
- Real-time data updates from API endpoints
- Error handling for failed API requests
- Loading states for all data sections

#### Login Page /login

Authentication portal for administrators using Sign-In with Ethereum (SIWE). This page should only be accessible via direct URL and not linked from the main view page.

**Authentication Flow:**
- Connect wallet button to initiate Web3 connection
- Display connected wallet address
- Generate SIWE challenge message via `/api/v1/auth/challenge/{address}`
- Request user to sign the challenge message with their wallet
- Submit signed message via `/api/v1/auth/login`
- Receive JWT token valid for 24 hours
- Redirect to admin dashboard on successful authentication

**UI Components:**
- Clean, minimal design focused on authentication
- Wallet connection status indicator
- Sign message button (only shown after wallet connected)
- Loading states during authentication process
- Error messages for failed authentication
- Success message before redirect

**Security Considerations:**
- Validate Ethereum address format
- Handle wallet connection errors gracefully
- Secure token storage (localStorage/sessionStorage)
- Clear error messages without exposing sensitive information
- Automatic redirect if already authenticated

**Technical Requirements:**
- Web3 wallet integration (MetaMask, WalletConnect, etc.)
- SIWE message generation and verification
- JWT token handling and storage
- Redirect logic to admin page after successful login

#### Admin Page /admin

Protected administrative interface requiring valid JWT authentication. Provides full CRUD operations for all organizational data management.

**Authentication Guard:**
- Verify JWT token validity on page load
- Redirect to login page if token expired or invalid
- Display current admin user information
- Logout functionality that clears token

**Organization Management:**
- Update organization name
- View and manage organization settings

**Treasury & Transfer Management:**
- View treasury assets (read-only - updated by tracking service)
- Update transfer party names via `/api/v1/transfer-parties/{address}`
- Search and filter transfer parties

**Expense Management:**
- Full CRUD operations for expenses
- Create new expense form with all required fields:
  - Item, quantity, price, purpose, category, date
  - Optional transaction hash
- Edit existing expenses
- Delete expenses with confirmation
- Filter expenses by category
- Pagination for expense list

**Grant Management:**
- Create new grants with comprehensive form:
  - Name, recipient name, description
  - Team URL, project URL (optional)
  - Recipient address, grant amounts
  - Start date, expected completion date
- Update grant details
- Milestone management:
  - Define milestone names and descriptions
  - Set grant amounts for each milestone
  - Mark milestones as completed
  - Sign off on completed milestones
- Track grant disbursements
- Monitor funds usage through expense tracking

**Admin User Management:**
- List all administrators
- Add new admin users (name and Ethereum address)
- Remove admin users
- View admin action audit log with filtering:
  - Filter by admin address
  - Filter by action type
  - Pagination support

**Audit Log:**
- Comprehensive logging of all admin actions
- Display timestamp, admin name, action type, affected resource
- Filter and search capabilities
- Export functionality for compliance

**UI Features:**
- Dashboard overview with key metrics
- Responsive design for mobile and desktop
- Form validation for all inputs
- Confirmation dialogs for destructive actions
- Success/error notifications for all operations
- Loading states for async operations
- Breadcrumb navigation
- Search and filter functionality across all sections

**Technical Requirements:**
- JWT authentication on all API calls
- Form validation and error handling
- Ethereum address validation
- Date picker components
- Rich text editor for descriptions
- Export functionality for audit logs
- Print-friendly views for reports


#### Transfer Page /transfer/<id>
- Shows all of the information of a transfer,
- reachable if a transfer is clicked on
- can be accessed directly via link


#### Expense Page /expense/<id>
- shows all of the information of an expense
- reachable if an expense is clicked on
- can be accessed directly via link

#### Grant Page /grant/<id>
- shows all of the information about a grant, including expense list and milestones on a page
- reachable if the grant is clicked on
- can be accessed directly via lint

### Backend

#### Primary API Server

Golang API Server

[API Endpoints](./openapi.yaml)

Provides all of the endpoints, with auth support.

Authentication will be SiwE, and then jwt will be signed with a local jwt key.

##### Technical Requirements
* Can optionally use SSL when connecting to the PostgreSQL database
* Must statically compile into a binary usable on x86_64 and arm64 achitectures

#### Transaction Tracking Service

This service tracks all ethereum transfers and ERC20 token transfers for the treasury wallets, and adds them to the database as Transfers.
We want to keep this service ultra-light. 

It should be able to handle multiple chains.

##### Technical Requirements
* Can optionally use SSL when connecting to the PostgreSQL database
* Must handle reorganizations of the underlying blockchain.
* Must statically compile into a binary usable on x86_64 and arm64 achitectures
* Must handle the database migration on startup if it is needed
* Should use alchemy api to make it easy https://www.alchemy.com/reference/alchemy-getassettransfers 

### Infrastructure

#### PostgreSQL

This will be the primary database.


## Deployment & Devops UX


### Dockerfile

We will need a Dockerfile for each supported architecture: x86_64 and arm64

It should push these in a way that docker will automatically chose the correct image for the machines architecture, using docker image manifests. 

### Helm

The helm chart will optionally setup and configure a postgresql server (they can also chose not to do this and provide their own). Defaults to it including postgresql server in the deployment.

#### Features 
* User should be able to adjust the resource allocations of all of the services individually, and the replication parameters of the api and front end services.
* User can chose either to have a PostgreSQL database deployed or provide credentials and connection information for an existing database

### Railway

* Railway template that is deployable from https://railway.com/deploy
