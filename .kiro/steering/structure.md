# Project Structure

## Workspace Organization

This is a monorepo with npm workspaces containing separate frontend and backend applications.

```
travel-itinerary-generator/
├── frontend/                 # React application
├── backend/                  # Express.js API server
├── deployment/               # Deployment scripts and guides
├── .kiro/                    # Kiro IDE configuration
└── package.json              # Root workspace configuration
```

## Frontend Structure (`frontend/`)

```
frontend/
├── src/
│   ├── components/          # React components (PascalCase)
│   │   ├── CityInput.tsx
│   │   ├── SpotSelection.tsx
│   │   ├── ItineraryDisplay.tsx
│   │   ├── LoadingSpinner.tsx
│   │   └── ErrorBoundary.tsx
│   ├── hooks/               # Custom React hooks (camelCase)
│   │   └── useAppState.ts
│   ├── services/            # API and external service calls
│   │   └── api.ts
│   ├── types/               # TypeScript type definitions
│   │   └── index.ts
│   ├── App.tsx              # Main application component
│   ├── main.tsx             # Application entry point
│   └── index.css            # Global styles
├── public/                  # Static assets
├── .env.example             # Environment template
└── package.json
```

## Backend Structure (`backend/`)

```
backend/
├── src/
│   ├── routes/              # Express route handlers
│   ├── services/            # Business logic and external integrations
│   │   ├── BedrockAgentService.ts
│   │   └── index.ts
│   ├── middleware/          # Express middleware
│   │   ├── errorHandler.ts
│   │   ├── requestLogger.ts
│   │   └── sessionStorage.ts
│   ├── config/              # Configuration management
│   │   └── index.ts
│   ├── types/               # TypeScript type definitions
│   │   └── express.d.ts     # Express type extensions
│   └── server.ts            # Application entry point
├── .env.example             # Environment template
└── package.json
```

## Naming Conventions

### Files & Directories
- **Components**: PascalCase (e.g., `CityInput.tsx`)
- **Hooks**: camelCase with "use" prefix (e.g., `useAppState.ts`)
- **Services**: PascalCase with "Service" suffix (e.g., `BedrockAgentService.ts`)
- **Middleware**: camelCase (e.g., `errorHandler.ts`)
- **Types**: camelCase for files, PascalCase for interfaces

### Code
- **Interfaces**: PascalCase (e.g., `AppState`, `ApiResponse`)
- **Variables/Functions**: camelCase
- **Constants**: UPPER_SNAKE_CASE
- **Components**: PascalCase

## Path Mapping

Both frontend and backend use TypeScript path mapping:
- `@/*` maps to `src/*`
- `@/components/*` maps to `src/components/*` (frontend)
- `@/services/*` maps to `src/services/*`
- `@/types/*` maps to `src/types/*`

## Key Architectural Patterns

### Frontend
- **Component-based architecture** with functional components
- **Custom hooks** for state management (no external state library)
- **Route-based navigation** with protected routes
- **Error boundaries** for graceful error handling

### Backend
- **Layered architecture**: Routes → Services → External APIs
- **Middleware pipeline**: Security → CORS → Logging → Session → Routes → Error handling
- **Session-based state** stored in memory (suitable for single-instance deployment)
- **Flexible CORS** configuration for multi-environment support

## Import Conventions

- Use ES modules (`import/export`)
- Prefer named exports over default exports for utilities
- Use default exports for React components
- Always include `.js` extension in backend imports (ES modules requirement)