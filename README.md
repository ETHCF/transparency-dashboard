# Transparency Dashboard

Ethereum treasury management and transparency dashboard for DAOs and foundations.

## Features

### Core
- Real-time blockchain integration via Alchemy API
- Multi-signature wallet support (Gnosis Safe)
- ETH and ERC-20 token tracking
- Budget management with variance analysis
- Grant and expense tracking

### Advanced
- CSV, JSON, and PDF export
- Role-based access control
- SIWE authentication
- Burn rate analysis and runway projections
- 90-day historical data

## Requirements

- Docker & Docker Compose
- Node.js 18+ and Yarn
- Go 1.21+
- PostgreSQL 15+
- Alchemy API Key

## Installation

1. Clone the repository
```bash
git clone https://github.com/yourusername/transparency-dashboard.git
cd transparency-dashboard
```

2. Set up environment variables
```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

3. Configure backend/.env
```env
DBHOST=localhost
DBPORT=5432
DBNAME=transparency
DBUSER=tpd_user
DBPASSWORD=your_password
LISTEN=0.0.0.0:8080
INITIAL_ADMIN_ADDRESS=0xYourAddress
RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY
DEV_MODE=false
```

4. Configure frontend/.env
```env
VITE_API_BASE_URL=http://localhost:8080
VITE_DEV_MODE=false
```

5. Start with Docker
```bash
docker-compose up -d
```

6. Access at http://localhost:5173

## Architecture

### Backend
- Gin Web Framework (Go)
- PostgreSQL with GORM
- JWT authentication with SIWE
- Alchemy API for blockchain data

### Frontend
- React 19 with TypeScript
- TanStack Router and Query
- Zustand for state management
- Recharts for data visualization
- Vite build system

## Development

### Backend
```bash
cd backend
go mod download
go run cmd/api/main.go
```

### Frontend
```bash
cd frontend
yarn install
yarn dev
```

### Testing
```bash
# Backend
cd backend
go test ./...

# Frontend
cd frontend
yarn test
```

### Production Build
```bash
# Backend
cd backend
go build -o bin/api cmd/api/main.go

# Frontend
cd frontend
yarn build
```

## Project Structure

```
transparency-dashboard/
├── backend/
│   ├── cmd/api/          # API entry point
│   ├── pkg/
│   │   ├── alchemy/      # Blockchain integration
│   │   ├── auth/         # Authentication
│   │   ├── database/     # Database models
│   │   └── handlers/     # HTTP handlers
│   └── migrations/       # Database migrations
├── frontend/
│   ├── src/
│   │   ├── components/   # React components
│   │   ├── routes/       # Page components
│   │   ├── services/     # API services
│   │   ├── stores/       # State management
│   │   └── utils/        # Utilities
│   └── public/          # Static assets
└── docker-compose.yml   # Container orchestration
```

## Deployment

### Frontend (Vercel/Netlify)
- Build command: `cd frontend && yarn build`
- Output directory: `frontend/dist`

### Backend (Railway/Render)
- Build command: `cd backend && go build -o bin/api cmd/api/main.go`
- Start command: `./bin/api`
- Provision PostgreSQL database

### Production Checklist
- Set strong database passwords
- Configure CORS
- Set up SSL certificates
- Configure rate limiting
- Set up monitoring
- Configure backups
- Review security headers
- Set up CI/CD

## Security

- Read-only blockchain integration
- No private key storage
- SIWE authentication
- Role-based access control
- Environment variable configuration

## License

MIT