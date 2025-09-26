# Technology Stack

## Build System & Package Management

- **Package Manager**: npm with workspaces
- **Build Tool**: Vite (frontend), TypeScript compiler (backend)
- **Task Runner**: npm scripts with concurrently for parallel execution
- **Module System**: ES Modules (type: "module" in package.json)

## Frontend Stack

- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite with React plugin
- **Routing**: React Router DOM v6
- **HTTP Client**: Axios
- **Styling**: CSS with inline styles (no CSS framework)
- **State Management**: Custom hooks (useAppState)

## Backend Stack

- **Runtime**: Node.js (v18+)
- **Framework**: Express.js with TypeScript
- **AWS SDK**: @aws-sdk/client-bedrock-agent-runtime
- **Security**: Helmet, CORS with flexible origin matching
- **Validation**: express-validator
- **Development**: tsx with watch mode
- **Testing**: Vitest with Supertest

## Development Tools

- **TypeScript**: Strict mode enabled with path mapping
- **Linting**: ESLint with TypeScript rules
- **Testing**: Vitest (backend), no frontend tests currently
- **Process Management**: PM2 for production

## Common Commands

### Development
```bash
npm run install:all          # Install all dependencies
npm run dev                  # Start both servers concurrently
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
npm run test               # Run backend tests
```

### Server Management
```bash
./restart-servers.sh       # Restart development servers
./stop-servers.sh          # Stop servers on ports 3000/3001
```

## Environment Configuration

- **Backend**: `.env` file with AWS credentials and Bedrock config
- **Frontend**: `.env` file with API URL (VITE_ prefix required)
- **Production**: Environment variables set in deployment platform