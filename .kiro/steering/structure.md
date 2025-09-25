# Project Structure

## Workspace Organization
This is a monorepo with npm workspaces containing separate frontend and backend applications.

```
travel-itinerary-generator/
├── frontend/                 # React application
├── backend/                  # Express API server
├── package.json             # Root workspace configuration
└── .kiro/                   # Kiro IDE configuration
```

## Frontend Structure (`frontend/`)
```
frontend/
├── src/
│   ├── components/          # React components (5 components)
│   │   ├── CityInput.tsx    # Step 1: City input form
│   │   ├── SpotSelection.tsx # Step 2: Spot selection interface
│   │   ├── ItineraryDisplay.tsx # Step 3: Final itinerary
│   │   ├── LoadingSpinner.tsx # Loading states
│   │   └── ErrorBoundary.tsx # Error handling
│   ├── hooks/               # Custom React hooks
│   │   └── useAppState.ts   # Global state management
│   ├── services/            # API client services
│   │   └── api.ts           # Axios-based API client
│   ├── types/               # TypeScript type definitions
│   └── main.tsx             # Application entry point
├── public/                  # Static assets
└── dist/                    # Build output
```

## Backend Structure (`backend/`)
```
backend/
├── src/
│   ├── routes/              # API endpoints (4 routes)
│   │   └── cityRoutes.ts    # City verification and itinerary endpoints
│   ├── services/            # Business logic
│   │   └── BedrockAgentService.ts # AWS Bedrock integration
│   ├── middleware/          # Express middleware
│   │   ├── errorHandler.ts  # Global error handling
│   │   ├── requestLogger.ts # Request logging
│   │   └── sessionStorage.ts # Session management
│   ├── config/              # Configuration
│   ├── types/               # TypeScript definitions
│   └── __tests__/           # Test files (81 tests)
├── dist/                    # Build output
└── server.ts                # Application entry point
```

## Naming Conventions
- **Files**: camelCase for TypeScript files, PascalCase for React components
- **Directories**: lowercase with hyphens for multi-word names
- **Components**: PascalCase, descriptive names reflecting functionality
- **Services**: PascalCase with "Service" suffix
- **Types**: PascalCase interfaces, camelCase for type aliases

## Path Mapping
Both frontend and backend use TypeScript path mapping:
- `@/*` - src directory root
- `@/components/*` - components directory (frontend)
- `@/services/*` - services directory
- `@/types/*` - types directory
- `@/middleware/*` - middleware directory (backend)
- `@/routes/*` - routes directory (backend)

## File Organization Principles
- Group by feature/domain rather than file type
- Keep related files close together
- Use index files for clean imports
- Separate concerns: components, services, types
- Co-locate tests with source files when possible