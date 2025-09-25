# Technology Stack

## Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite 5.0
- **Routing**: React Router DOM v6
- **HTTP Client**: Axios
- **Styling**: CSS with responsive design
- **Development**: Hot reload, ESLint, TypeScript strict mode

## Backend
- **Runtime**: Node.js with TypeScript (ES Modules)
- **Framework**: Express.js
- **AWS SDK**: @aws-sdk/client-bedrock-agent-runtime
- **Security**: Helmet, CORS, express-validator
- **Session**: In-memory storage with UUID
- **Testing**: Vitest with 81 comprehensive tests

## Development Tools
- **TypeScript**: Strict mode with path mapping (@/* aliases)
- **ESLint**: Standard rules + TypeScript recommended
- **Package Manager**: npm with workspaces
- **Concurrency**: concurrently for running both servers

## Common Commands

### Setup
```bash
npm run install:all          # Install all dependencies
```

### Development
```bash
npm run dev                  # Start both frontend and backend
npm run dev:frontend         # Frontend only (port 3000)
npm run dev:backend          # Backend only (port 3001)
```

### Building
```bash
npm run build               # Build both projects
npm run build:frontend      # Build frontend only
npm run build:backend       # Build backend only
```

### Quality Assurance
```bash
npm run lint               # Lint both projects
npm run type-check         # TypeScript checking
cd backend && npm test     # Run backend tests (81 tests)
```

## Environment Configuration
- Backend: Copy `.env.example` to `.env` and configure AWS credentials
- Frontend: Copy `.env.example` to `.env` (optional, defaults work for dev)